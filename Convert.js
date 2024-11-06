import {
  S3Client,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import {
  TranscribeClient,
  StartTranscriptionJobCommand,
  GetTranscriptionJobCommand,
} from '@aws-sdk/client-transcribe';
import {
  TranslateClient,
  TranslateTextCommand,
} from '@aws-sdk/client-translate';
import {
  PollyClient,
  SynthesizeSpeechCommand,
} from '@aws-sdk/client-polly';
import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import ffmpeg from 'fluent-ffmpeg';

// Set AWS credentials and region
const s3Client = new S3Client({
  region: 'ap-south-1',
  credentials: {
    accessKeyId: ' ',
    secretAccessKey: ' ',
  },
});

const transcribeClient = new TranscribeClient({
  region: 'ap-south-1',
  credentials: {
    accessKeyId: '',
    secretAccessKey: '',
  },
});
const translateClient = new TranslateClient({
  region: 'ap-south-1',
  credentials: {
    accessKeyId: '',
    secretAccessKey: '',
  },
});
const pollyClient = new PollyClient({
  region: 'ap-south-1',
  credentials: {
    accessKeyId: '',
    secretAccessKey: '',
  },
});

// Function to upload a file to S3
const uploadToS3 = async (filePath) => {
  const fileContent = fs.readFileSync(filePath);
  const params = {
    Bucket: 'skillpeak',
    Key: path.basename(filePath),
    Body: fileContent,
    ContentType: 'audio/ogg',
  };

  await s3Client.send(new PutObjectCommand(params)); // Upload the file to S3
  return `https://${params.Bucket}.s3.amazonaws.com/${params.Key}`; // Return the file URL
};

// Function to extract audio from video
const extractAudioFromVideo = async (videoPath, outputAudioPath) => {
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .output(outputAudioPath)
      .on('end', () => {
        console.log('Audio extracted successfully');
        resolve();
      })
      .on('error', (err) => {
        console.error('Error extracting audio:', err);
        reject(err);
      })
      .run();
  });
};

// Function to transcribe audio
const transcribeAudio = async (audioFile) => {
  const params = {
    LanguageCode: 'en-US',
    Media: { MediaFileUri: audioFile },
    MediaFormat: 'ogg',
    TranscriptionJobName: 'SpeechToTextJob-' + Date.now(), // Unique job name
  };
  const result = await transcribeClient.send(new StartTranscriptionJobCommand(params));
  return result.TranscriptionJob.TranscriptionJobName; // Return job name for later use
};

// Function to check the transcription job status and get the transcription text
const getTranscriptionResult = async (jobName) => {
  const params = { TranscriptionJobName: jobName };
  let job;

  // Polling for job completion
  do {
    job = await transcribeClient.send(new GetTranscriptionJobCommand(params));
    await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait 5 seconds before checking again
  } while (job.TranscriptionJob.TranscriptionJobStatus === 'IN_PROGRESS');

  if (job.TranscriptionJob.TranscriptionJobStatus === 'COMPLETED') {
    return job.TranscriptionJob.Transcript.TranscriptFileUri; // Return the URL of the transcript
  } else {
    throw new Error(`Transcription job failed: ${job.TranscriptionJob.TranscriptionJobStatus}`);
  }
};

// Function to fetch the transcription text from the returned URL
const fetchTranscriptionText = async (transcriptionUrl) => {
  const response = await fetch(transcriptionUrl);
  const data = await response.json();
  return data.results.transcripts[0].transcript; // Extract the transcript text
};

// Function to translate text
const translateText = async (text, targetLanguage) => {
  const params = {
    SourceLanguageCode: 'en',
    TargetLanguageCode: targetLanguage,
    Text: text,
  };
  const result = await translateClient.send(new TranslateTextCommand(params));
  return result.TranslatedText; // Return translated text
};

// Function to convert text to speech
const textToSpeech = async (text) => {
  const params = {
    Text: text,
    OutputFormat: 'mp3',
    VoiceId: 'Aditi', // Hindi voice
  };
  
  const result = await pollyClient.send(new SynthesizeSpeechCommand(params));

  // Save audio stream to a file
  const audioFileName = 'translated_audio.mp3';

  return new Promise((resolve, reject) => {
    // Create a writable stream for the audio file
    const file = fs.createWriteStream(audioFileName);

    // Check if AudioStream is present
    if (result.AudioStream) {
      result.AudioStream.on('error', (err) => {
        console.error('Error in audio stream:', err);
        reject(err);
      });

      // Pipe the audio stream to the file
      result.AudioStream.pipe(file);

      file.on('finish', () => {
        console.log(`Translated audio saved as: ${audioFileName}`);
        resolve(audioFileName); // Resolve with the filename
      });

      file.on('error', (err) => {
        console.error('Error writing to file:', err);
        reject(err);
      });
    } else {
      reject(new Error('Audio stream is missing in the response'));
    }
  });
};
// Function to get audio duration
const getAudioDuration = async (audioPath) => {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(audioPath, (err, metadata) => {
      if (err) {
        console.error('Error getting audio duration:', err);
        reject(err);
      } else {
        const duration = metadata.format.duration;
        resolve(duration);
      }
    });
  });
};

// Function to pad audio if it's shorter than original audio
const padAudio = async (audioPath, outputPath, targetDuration) => {
  const audioDuration = await getAudioDuration(audioPath);
  console.log(`Original Audio Duration: ${audioDuration}`);
  
  const silenceDuration = Math.max(0, targetDuration - audioDuration);
  console.log(`Silence Duration Needed: ${silenceDuration}`);

  const silentAudioPath = '/Users/aryenrawat/Desktop/demo/slient.mp3'; // Path to your silent audio file

  // If silence is needed, use ffmpeg to pad the audio
  if (silenceDuration > 0) {
    return new Promise((resolve, reject) => {
      ffmpeg()
        .input(audioPath)
        .input(silentAudioPath)
        .outputOptions('-filter_complex', `[0:a]atrim=end=${audioDuration}[a1];[1:a]atrim=end=${silenceDuration}[a2];[a1][a2]concat=n=2:v=0:a=1[out]`)
        .outputOptions('-map', '[out]')
        .save(outputPath)
        .on('end', () => {
          console.log('Padded audio created successfully');
          resolve(outputPath);
        })
        .on('error', (err) => {
          console.error('Error padding audio:', err);
          reject(err);
        });
    });
  } else {
    // If no padding needed, just return the original audio path
    console.log('No padding needed');
    return audioPath;
  }
};

// Function to replace audio in the video
const replaceAudioInVideo = async (videoPath, audioPath, outputVideoPath) => {
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .outputOptions('-i', audioPath) // Use the translated audio file
      .outputOptions('-c:v', 'copy') // Copy video codec
      .outputOptions('-c:a', 'aac') // Set audio codec to AAC
      .outputOptions('-map', '0:v:0') // Map video stream from the input video
      .outputOptions('-map', '1:a:0') // Map audio stream from the input audio
      .on('end', () => {
        console.log(`Audio replaced successfully, saved as: ${outputVideoPath}`);
        resolve();
      })
      .on('error', (err) => {
        console.error('Error replacing audio:', err);
        reject(err);
      })
      .save(outputVideoPath);
  });
};

// Main function to handle the workflow
const main = async () => {
  const videoFilePath = '/Users/aryenrawat/Desktop/demo/video.mp4'; // Path to your video file
  const extractedAudioPath = '/Users/aryenrawat/Desktop/demo/extracted_audio.ogg'; // Path for extracted audio
  const outputVideoPath = '/Users/aryenrawat/Desktop/demo/output_video.mp4'; // Path for the output video

  // Step 1: Extract audio from video
  await extractAudioFromVideo(videoFilePath, extractedAudioPath);

  // Step 2: Upload the audio file to S3
  const audioFileUrl = await uploadToS3(extractedAudioPath);
  console.log(`Uploaded audio file to S3: ${audioFileUrl}`);

  // Step 3: Transcribe the audio
  const jobName = await transcribeAudio(audioFileUrl);
  console.log(`Transcription job started: ${jobName}`);

  // Step 4: Get the transcription result
  const transcriptionUrl = await getTranscriptionResult(jobName);
  const transcriptionText = await fetchTranscriptionText(transcriptionUrl);
  console.log(`Transcribed text: ${transcriptionText}`);

  // Step 5: Translate the text to Hindi
  const translatedText = await translateText(transcriptionText, 'hi'); // Translate to Hindi
  console.log(`Translated text: ${translatedText}`);

  // Step 6: Convert translated text to audio
  const translatedAudioFile = await textToSpeech(translatedText);
  console.log(`Translated audio saved as: ${translatedAudioFile}`);

  // Step 7: Get the duration of the original video
  const videoDuration = await getAudioDuration(videoFilePath);

  // Step 8: Pad the translated audio if needed
  const paddedAudioFile = await padAudio(translatedAudioFile, 'padded_audio.mp3', videoDuration);

  // Step 9: Replace original audio with padded translated audio in the video
  await replaceAudioInVideo(videoFilePath, paddedAudioFile, outputVideoPath);
};

// Execute the main function
main().catch(console.error);
