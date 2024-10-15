import type { NextApiRequest, NextApiResponse } from 'next';
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';

export const config = {
  api: {
    responseLimit: false,
  },
};

const generateAssFile = (subtitlesContent: string, subtitlesStyle: Record<string, any> | undefined): string => {
  const {
      fontname = "Montserrat",
      fontsize = 20,
      primary_color = "#FFFFFF",
      highlight_color = "#0000FF",
      // outline_color = "&H00000000",
      // back_color = "&H00000000",
      highlight_bg_color = "&H00FFC0CB",
      bold = -1,
      italic = 0,
      underline = 0,
      strike_out = 0,
      scale_x = 100,
      scale_y = 100,
      spacing = 1.5,
      angle = -5,
      border_style = 5,
      outline = 0,
      shadow = 0,
      alignment = 2,
      margin_l = 10,
      margin_r = 50,
      margin_v = 50,
      // encoding = 0
    } = subtitlesStyle || {};

    // Header with default styles
    const assHeader = `
[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,${fontname},${fontsize},${hexToBgr(primary_color)},${hexToBgr(primary_color)},&H00000000,&H00000000,${bold},${italic},${underline},${strike_out},${scale_x},${scale_y},${spacing},${angle},1,0,${shadow},${alignment},${margin_l},${margin_r},${margin_v},1
[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

    // Process each subtitle line
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


        const subtitleText = arr[index + 1].split(' '); // Split the subtitle into individual words
        const wordInterval = (end - start) / subtitleText.length;

        const dialogues = subtitleText.map((word: string, i: number) => {
          const wordStart = start + i * wordInterval;
          const wordEnd = wordStart + wordInterval;

          const beforeWord = subtitleText.slice(0, i).join(' ');
          const afterWord = subtitleText.slice(i + 1).join(' ');

                    // Current highlighted word
                    const styledWord = `{\\c${hexToBgr(highlight_color)}&\\bord${border_style}\\shad${outline}\\3c${hexToBgr(highlight_bg_color)}&\\fscx${scale_x * 1.5}\\fscy${scale_y * 1.5}}${word}{\\c${hexToBgr(primary_color)}&\\bord1\\3c&H00000000&\\fscx${scale_x}\\fscy${scale_y}}`; // Apply borderStyle and outline color

                    return `Dialogue: 0,${formatTime(wordStart)},${formatTime(wordEnd)},Default,,0,0,0,,${beforeWord} ${styledWord} ${afterWord}`;
                });

                return dialogues.join('\n'); // Combine all dialogue lines
            }
            return '';
        })
        .filter(Boolean)
        .join('\n');

    return assHeader + assBody;
};

// Helper function to format time
const formatTime = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const mins = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toFixed(2).padStart(5, '0');
    return `${hrs}:${mins}:${secs}`;
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


const ensureDirectoryExistence = (filePath: string) => {
  const dirname = path.dirname(filePath);
  if (!fs.existsSync(dirname)) {
    fs.mkdirSync(dirname, { recursive: true });
  }
};


export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { videoUrl, subtitlesContent, config } = req.body;

    const inputVideoPath = path.posix.join('public', videoUrl).replace(/\\/g, '/').replace(/^\/+/, '');

    const outputVideoPath = path.posix.join('public', 'videos', 'output.mp4').replace(/\\/g, '/');
    const tempAssSubtitlesPath = path.posix.join('public', 'subtitles', 'temp.ass').replace(/\\/g, '/');
//     console.log("this is subtitles content : ", subtitlesContent)
//     console.log('Input Video Path:', inputVideoPath);
// console.log('Output Video Path:', outputVideoPath);
// console.log('Temp ASS Subtitles Path:', tempAssSubtitlesPath);
// console.log("config font : ", config.font)

    try {
      // Generate ASS subtitle content with styles
      ensureDirectoryExistence(tempAssSubtitlesPath);
      const assContent = generateAssFile(subtitlesContent, config.font);

      console.log('Generated ASS Content:', assContent);

      // Save the ASS file to disk
      fs.writeFileSync(tempAssSubtitlesPath, assContent);

      exec(`ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0 ${inputVideoPath}`, (error, stdout) => {
        if (error) {
          return res.status(500).json({ error: 'Failed to get video resolution' });
        }

        const [, videoHeight] = stdout.trim().split(',').map(Number);
        const cropHeight = videoHeight;
        const cropWidth = (9 / 16) * cropHeight;

        exec(`ffmpeg -i ${inputVideoPath} -vf "crop=${cropWidth}:${cropHeight}, ass=${tempAssSubtitlesPath}:fontsdir=public/fonts/" ${outputVideoPath}`, (error) => {
          if (error) {
            return res.status(500).json({ error: 'Failed to process video' });
          }

          // Stream the processed video as a response
          res.setHeader('Content-Type', 'video/mp4');
          const fileStream = fs.createReadStream(outputVideoPath);
          fileStream.pipe(res);

          // Cleanup after sending the file
          fileStream.on('end', () => {
            fs.unlinkSync(outputVideoPath);
            fs.unlinkSync(tempAssSubtitlesPath);
          });
        });
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to process video' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
