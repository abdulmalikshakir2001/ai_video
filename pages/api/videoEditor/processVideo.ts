import type { NextApiRequest, NextApiResponse } from 'next';
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';

// Define the type for each font setting
interface FontStyleSettings {
  borderStyle: number;
  outline: number;
  backgroundColor: string; 
}

// Define a type for the available font settings
type id = 1 | 2 | 3 | 4 | 5 | 6;

// Create the font settings object with a specific type
const fontSettings: Record<id, FontStyleSettings> = {
  1: { borderStyle: 5, outline: 0.0, backgroundColor: ''},
  2: { borderStyle: 5, outline: 0.0, backgroundColor: ''},
  3: { borderStyle: 2, outline: 3.0, backgroundColor: ''},
  4: { borderStyle: 2, outline: 3.0, backgroundColor: ''},
  5: { borderStyle: 1, outline: 3.0, backgroundColor: '#FFFFFF'},
  6: { borderStyle: 1, outline: 3.0, backgroundColor: ''},
};

const generateAssFile = (subtitlesContent: string, subtitlesStyle: Record<string, any> | undefined): string => {
  const {
  id = 1,
  fontFamily = 'Arial',
  fontSize = 24,
  color = '&HFFFFFFFF', // Text color (PrimaryColour)
  highlightColor = '#0000FF', // active word color
  backgroundColor = '&HFFFFFFFF', // Background color
  bold = -1,
  italic = 0,
  underline = 0,
  strikeOut = 0,
  scaleX = 100,
  scaleY = 100,
  letterSpacing = 3,
  borderStyle = 3, // Set to 3 for background box or bg color
  outline = 2.0,
  shadow = 2.0,
  textAlign = 'center',
  marginR = 50,
  textTransform = 'none',
  rotation = -2,
  xPosition = 0,
  yPosition = 0,
  scale = 1,
  } = subtitlesStyle || {};


  // Map textAlign to the corresponding ASS alignment values
  let alignment;
  switch (textAlign) {
    case 'left':
      alignment = 1; // Left alignment
      break;
    case 'center':
      alignment = 2; // Center alignment
      break;
    case 'right':
      alignment = 3; // Right alignment
      break;
    default:
      alignment = 2; // Default to center alignment if no valid textAlign is provided
  }

  // Use font id to fetch settings from fontSettings
  const fontSettingsForFamily = fontSettings[id as id];

  if (!fontSettingsForFamily) {
    console.error(`No font settings found for ${id}`);
  } else {
    // console.log(`Settings for ${id}:`, fontSettingsForFamily);
  }

  const {
    borderStyle: fontBorderStyle = borderStyle,
    outline: fontOutline = outline,
    backgroundColor: fontBackgroundColor = backgroundColor,
  } = fontSettingsForFamily || {};

  // Transform positions
  const transformedYPosition = -yPosition;

  // Transform rotation
  const transformedRotation = -rotation;

  // Handle scale
  const transformedScaleX = scale * 100; // scaleX in ASS is percentage, hence multiply by 100
  const transformedScaleY = scale * 100;

  // Create the ASS file header with the provided style
  const assHeader = `
[Script Info]
; Script generated by your script
ScriptType: v4.00+
PlayResX: 384
PlayResY: 288
ScaledBorderAndShadow: yes
YCbCr Matrix: None

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,${fontFamily},${fontSize},${hexToBgr(color)},${hexToBgr(color)},${hexToBgr(backgroundColor || fontBackgroundColor)},,${bold},${italic},${underline},${strikeOut},${transformedScaleX},${transformedScaleY},${letterSpacing},${transformedRotation},${fontBorderStyle},${fontOutline},${shadow},${alignment},${xPosition},${marginR},${transformedYPosition},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  // Convert SRT to ASS format
  const assBody = subtitlesContent
    .split('\n')
    .map((line, index, arr) => {
      if (line.includes('-->')) {
        const [start, end] = line.split(' --> ').map((time) =>
          time
            .replace(',', '.')
            .split(':')
            .map((num, i) => (i === 0 ? parseInt(num, 10) * 3600 : i === 1 ? parseInt(num, 10) * 60 : parseFloat(num)))
            .reduce((a, b) => a + b)
        );

        const subtitleText = arr[index + 1];
        // Apply text transformation
        const transformedText: string[] = applyTextTransform(subtitleText, textTransform).split(' ');

        const wordInterval = (end - start) / transformedText.length;
        const dialogues = transformedText.map((word: string, i: number) => {
          const wordStart = start + i * wordInterval;
          const wordEnd = wordStart + wordInterval;

          const beforeWord = transformedText.slice(0, i).join(' ');
          const afterWord = transformedText.slice(i + 1).join(' ');

          let styledWord;
          if (id === 1 || id === 2) {
            // Fonts 1 and 2 with outline color
            styledWord = `{\\c${hexToBgr(highlightColor)}&\\bord${fontBorderStyle}\\shad${fontOutline}\\3c${hexToBgr(backgroundColor || fontBackgroundColor)}&\\fscx${scaleX * 1.5}\\fscy${scaleY * 1.5}}${word}{\\c${hexToBgr(color)}&\\bord1\\3c&H00000000&\\fscx${scaleX}\\fscy${scaleY}}`; // Apply borderStyle and outline color
          } else {
            // Other fonts with highlight color
            styledWord = `{\\c${hexToBgr(highlightColor)}&\\fscx${scaleX * 1.5}\\fscy${scaleY * 1.5}}${word}{\\c${hexToBgr(color)}&\\fscx${scaleX}\\fscy${scaleY}}`;
          }

          return `Dialogue: 0,${formatTime(wordStart)},${formatTime(wordEnd)},Default,,0,0,0,,${beforeWord} ${styledWord} ${afterWord}`;
        });

        return dialogues.join('\n');
      }
      return '';
    })
    .filter(Boolean)
    .join('\n');

    // console.log('Generated ASS file body:', assBody);

  return assHeader + assBody;
};


// Apply text transformation
const applyTextTransform = (text: string, transform: 'uppercase' | 'lowercase' | 'capitalize' | 'none'): string => {
  switch (transform) {
    case 'uppercase':
      return text.toUpperCase();
    case 'lowercase':
      return text.toLowerCase();
    case 'capitalize':
      return text.replace(/\b\w/g, char => char.toUpperCase());
    case 'none':
    default:
      return text;
  }
};

// Convert time to ASS format (HH:MM:SS.sss)
const formatTime = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600).toString().padStart(2, '0');
  const minutes = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
  const secs = (seconds % 60).toFixed(2).padStart(5, '0');
  return `${hours}:${minutes}:${secs}`;
};

// convert Hex to BGR color code for ASS format
const hexToBgr = (hex: string): string => {
  // Remove the "#" if it exists
  hex = hex.replace(/^#/, '');

  // Convert the hex string to RGB components
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);

  // Convert RGB to BGR and return the result in the desired format
  return `&H${[b, g, r].map((c) => c.toString(16).padStart(2, '0')).join('')}`;
};




export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { videoUrl, subtitlesContent, selectedRatio, fontStyle, startTime, endTime } = req.body;

    console.log("subtitles style: > ", fontStyle)

    const inputVideoPath = path.posix.join('public', videoUrl).replace(/\\/g, '/');
    const outputVideoPath = path.posix.join('public', 'videos', 'output.mp4').replace(/\\/g, '/');
    const tempAssSubtitlesPath = path.posix.join('public', 'subtitles', 'temp.ass').replace(/\\/g, '/');

    try {
      // Generate ASS subtitle content with styles
      const assContent = generateAssFile(subtitlesContent, fontStyle);

      // Save the ASS file to disk
      fs.writeFileSync(tempAssSubtitlesPath, assContent);
      console.log('ASS subtitles file saved successfully:', tempAssSubtitlesPath);

      exec(`ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0 ${inputVideoPath}`, (error, stdout, stderr) => {
        if (error) {
          console.error('FFprobe error:', error);
          return res.status(500).json({ error: 'Failed to get video resolution' });
        }

        const [videoWidth, videoHeight] = stdout.trim().split(',').map(Number);

        let cropWidth, cropHeight;

        if (selectedRatio === '9:16') {
          cropHeight = videoHeight;
          cropWidth = (9 / 16) * cropHeight;
        } else if (selectedRatio === '1:1') {
          cropWidth = Math.min(videoWidth, videoHeight);
          cropHeight = cropWidth;
        } else {
          cropWidth = videoWidth;
          cropHeight = (9 / 16) * cropWidth;
        }

        exec(`ffmpeg -i ${inputVideoPath} -vf "crop=${cropWidth}:${cropHeight}, ass=${tempAssSubtitlesPath}:fontsdir=public/fonts/" -ss ${startTime.toString()} -to ${endTime.toString()} ${outputVideoPath}`, (error, stdout, stderr) => {
          if (error) {
            console.error('FFmpeg error:', error);
            return res.status(500).json({ error: 'Failed to process video' });
          }
          console.log('FFmpeg stdout:', stdout);
          console.error('FFmpeg stderr:', stderr);

          // Stream the processed video as a response
          res.setHeader('Content-Type', 'video/mp4');
          const fileStream = fs.createReadStream(outputVideoPath);
          fileStream.pipe(res);

          // Optionally, cleanup after sending the file
          fileStream.on('end', () => {
            fs.unlinkSync(outputVideoPath);
            fs.unlinkSync(tempAssSubtitlesPath);
          });
        });
      });
    } catch (error) {
      console.error('Error processing video:', error);
      res.status(500).json({ error: 'Failed to process video' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
