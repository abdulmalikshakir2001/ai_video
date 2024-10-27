import { NextApiRequest, NextApiResponse } from 'next';
import path from 'path';
import fs from 'fs';
// import { spawn } from 'child_process';

import { exec } from 'child_process';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { method } = req;

  try {
    switch (method) {
      case 'POST':
        if (req.body.subtitleStyle && req.body.videoClipPath) {
          // Handle video processing with subtitle overlay
          await handlePOST(req, res);
        } else {
          res
            .status(400)
            .json({ error: 'Subtitle style and video clip path are required' });
        }
        break;
      default:
        res.setHeader('Allow', 'POST');
        res.status(405).json({ error: `Method ${method} Not Allowed` });
    }
  } catch (error: any) {
    console.error('Error processing video:', error);
    res.status(500).json({ error: 'Failed to process video' });
  }
}
// Utility function to create the .ass file content
// Utility function to create the .ass file content

function createAssFile(transcriptionData: any, subtitleStyle: any) {
  const transcription = JSON.parse(transcriptionData);
  let assContent = `
[Script Info]
Title: Subtitles
ScriptType: v4.00+

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,40,&H00FFFFFF,&H00000000,&H00000000,&H00000000,1,1,0,2,10,10,30,0

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  let lastWordEndTime = 0; // Variable to store the last word's end time across segments

  const modifiedSegments = transcription.segments.map((segment: any) => {
    const modifiedWords = segment.words.map((word: any, index: number) => {
      // Handle missing start time
      if (!word.start) {
          word.start = 0.00;
        if (index > 0 && segment.words[index - 1].end) {
          word.start = segment.words[index - 1].end ; // Use previous word's end time as start time
        } 
      }

      // Handle missing end time
      if (!word.end && index < segment.words.length - 1) {
        word.end = segment.words[index + 1].start ; // Use next word's start time as end time
      }

      // Update the lastWordEndTime for the next segment
      lastWordEndTime = word.end || lastWordEndTime ;

      return {
        word: word.word,
        start: word.start,
        end: word.end,
        score: word.score,
        speaker: word.speaker,
      };
    });

    return {
      start: segment.start,
      end: segment.end,
      text: segment.text,
      words: modifiedWords,
      speaker: segment.speaker,
    };
  });



  // Return or log the modified transcription structure

  // Iterate through each transcription segment
  modifiedSegments.forEach((segment: any, segIndex: number) => {
    const words = segment.words;

    for (let i = 0; i < words.length; i += 3) {
      const wordGroup = words.slice(i, i + 3);

      // Get the start time of the first word in the group
      const threeWordGroupStartTime = wordGroup[0].start; // Fallback to previous end time
      const threeWordGroupEndTime = wordGroup[wordGroup.length - 1].end;
      // ------------------------------->
      const WHITE_COLOR = '\\1c&HFFFFFF&';
      const GREEN_COLOR = '\\1c&H00FF00&';

      const modifiedWords = words.map((word: any, index: number) => {
        // Handle missing start time
        if (!word.start) {
          if (index > 0 && words[index - 1].end) {
            word.start = words[index - 1].end; // Use previous word's end time as start time
          }
        }

        // Handle missing end time
        if (!word.end && index < words.length - 1) {
          word.end = words[index + 1].start; // Set to next word's start or add default duration
        }

        return word;
      });

      
            
      let command = '';
      // ------------------------------->

      const updatedWordGroup = wordGroup.map((word: any, index: number) => {
        if (!word.start || !word.end) {
          // Use previous word's end time as the current word's start time if missing
          if (index > 0 && !word.start) {
            word.start = wordGroup[index - 1].end || threeWordGroupStartTime;
          }
          // Use the next word's start time as the current word's end time if missing
          if (index < wordGroup.length - 1 && !word.end) {
            word.end = wordGroup[index + 1].start || threeWordGroupEndTime;
          }
        }
        return word;
      });
      

      // Handle missing start and end times
      let  nextWordTransition  = 1;
      wordGroup.forEach((word: any, index: number) => {
        const wordRange = Math.round(((word.end-word.start)*1000));
      
        // ------------------------------->
        if(index === 0 && wordGroup.length === 1 ){
          


          const tag = `{${WHITE_COLOR}\\t(${0},${5},${GREEN_COLOR})}${word.word}`;
          command += tag;

        }

          else if ( index === 0 ){
            const extraTimeBetweenWords =  ((wordGroup[index+1].start - wordGroup[index].end ) * 1000 ); 
             nextWordTransition =  wordRange + extraTimeBetweenWords ;
          const tag = `{${WHITE_COLOR}\\t(${0},${5},${GREEN_COLOR})\\t(${nextWordTransition},${nextWordTransition},${WHITE_COLOR})}${word.word} {${WHITE_COLOR}\\t(${nextWordTransition},${5},${GREEN_COLOR})`;
          command += tag;
        }

        else if(index === 1 && wordGroup.length === 2){
          const tag = `}${word.word}`
          command += tag;
        }

        else if(index === 1){
          nextWordTransition =  wordRange + nextWordTransition + ((wordGroup[index + 1].start - wordGroup[index].end) * 1000)
          

          const tag = `\\t(${nextWordTransition},${nextWordTransition},${WHITE_COLOR})}${word.word} {${WHITE_COLOR}\\t(${nextWordTransition},${5},${GREEN_COLOR})`
          command += tag;
        }
        else if(index === 2){
          const tag = `}${word.word}`
          command += tag;
        }
        
        

        // ------------------------------->
      });
      nextWordTransition = 1

      // ------------------------------->

      command = command.trim();
      // ------------------------------->

      const threeWordGroupStartTimeFormatted = formatTime(
        threeWordGroupStartTime
      );
      const threeWordGroupEndTimeFormatted = formatTime(threeWordGroupEndTime);

      const dialogue = `Dialogue: 0,${threeWordGroupStartTimeFormatted},${threeWordGroupEndTimeFormatted},Default,,0,0,0,,${command}\n`;
      // const text = wordGroup.map((word: any) => word.word).join(' ');
      assContent += dialogue;

      // Update the previousEndTime to the current group's end time for the next group
    }
  });

  return assContent;
}

// Utility function to format time for .ass file
function formatTime(seconds: number) {
  if (isNaN(seconds) || seconds === undefined || seconds === null) {
    return '0:00:00.00'; // Default to 0 if the time is invalid
  }
  const hours = Math.floor(seconds / 3600)
    .toString()
    
  const minutes = Math.floor((seconds % 3600) / 60)
    .toString()
    .padStart(2, '0');
  const secs = (seconds % 60).toFixed(2).padStart(5, '0');
  return `${hours}:${minutes}:${secs}`;
}

// Handle video processing with subtitle overlay
const handlePOST = async (req: NextApiRequest, res: NextApiResponse) => {
  const { subtitleStyle, videoClipPath } = req.body;
  try {
    // Generate .ass subtitle file content
    const transcriptionPath = path.join(
      process.cwd(),
      'uploads',
      subtitleStyle.transcriptionPath
    );

    const transcriptionData = fs.readFileSync(transcriptionPath, 'utf-8');
    console.log(subtitleStyle);

    const assContent = createAssFile(transcriptionData, subtitleStyle);

    // Save the .ass subtitle file temporarily
    //   const assFilePath = path.join(process.cwd(),'public', `ass.ass`);

    const assFilePath = path.posix
      .join('public', `ass.ass`)
      .replace(/\\/g, '/')
      .replace(/^\/+/, '');

    fs.writeFileSync(assFilePath, assContent);

    // Process the video with ffmpeg and overlay the subtitles
    //   const videoInputPath = path.join(process.cwd(), 'uploads', videoClipPath)
    const videoInputPath = path.posix
      .join('uploads', videoClipPath)
      .replace(/\\/g, '/')
      .replace(/^\/+/, '');

    //   const outputVideoPath = path.join('public', 'resultVideo.mp4').replace(/\\/g, '/');
    const outputVideoPath = path.posix
      .join('public', 'resultVideo.mp4')
      .replace(/\\/g, '/')
      .replace(/^\/+/, '');

    exec(
      `ffmpeg -i ${videoInputPath} -vf "ass=${assFilePath}:fontsdir=public/fonts/" ${outputVideoPath}`,
      (error) => {
        if (error) {
          console.log(error);
          return res.status(500).json({ error: 'Failed to process video' });
        }

        // Set headers for video stream and download
        res.setHeader('Content-Type', 'video/mp4');
        res.setHeader(
          'Content-Disposition',
          `attachment; filename=${'processed_video.mp4'}`
        );

        // Create a stream and pipe it to the response
        const fileStream = fs.createReadStream(outputVideoPath);
        fileStream.pipe(res);
        fileStream.on('error', (err) => {
          console.error('Error streaming the video:', err);
          res.status(500).json({ error: 'Failed to stream the video' });
        });

        // Optional: clean up files after streaming
        fileStream.on('end', () => {
          fs.unlinkSync(outputVideoPath); // Remove the output video after download
          fs.unlinkSync(assFilePath); // Remove the subtitle file after download
        });
      }
    );
  } catch (error) {
    console.error('Error processing video with subtitles:', error);
    res.status(500).json({ error: 'Failed to generate video with subtitles' });
  }
};
