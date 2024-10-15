import os
import whisperx
import ffmpeg
import random
# import gc
# import torch
from transformers import pipeline  # EmoRoBERTa model for emotion detection
# from clipsai import resize, MediaEditor, AudioVideoFile
from clipsai import ClipFinder, Transcriber
from moviepy.video.io.VideoFileClip import VideoFileClip
import json
import sys



def videoProcessing(config):
    print(config)
    if not os.path.exists(config["output_folder"]):
        os.makedirs(config["output_folder"])
    # login(token=config['pyannote_auth_token'])
    def generate_json_file_from_diarized_result(diarized_result, config, filenameWithOutExt):
        json_file_path = os.path.join(config["output_folder"], f"{filenameWithOutExt}_transcription.json")
        
        # Open file in write mode and dump the JSON content
        with open(json_file_path, 'w', encoding='utf-8') as json_file:
            json.dump(diarized_result, json_file, indent=4, ensure_ascii=False)
        
        print(f"Transcription JSON file generated: {json_file_path}")

    # def preload_emotion_images(config):
    # # List of all emotions including neutral
    #     emotions = [
    #         "admiration", "amusement", "anger", "annoyance", "approval", "caring", 
    #         "confusion", "curiosity", "desire", "disappointment", "disapproval", 
    #         "disgust", "embarrassment", "excitement", "fear", "gratitude", "grief", 
    #         "joy", "love", "nervousness", "optimism", "pride", "realization", 
    #         "relief", "remorse", "sadness", "surprise", "neutral"
    #     ]

    #     # Preload the PNG files for all emotions
    #     png_files = {}
    #     for emotion in emotions:
    #         png_file = os.path.join(config["image_folder"], f"{emotion}.png")
    #         if os.path.exists(png_file):
    #             # Preload the image as an input stream and resize it once
    #             png_files[emotion] = ffmpeg.input(png_file, s=f"{config['image_size']}x{config['image_size']}")
    #     return png_files


    # def classify_video_content(text):
    #     classifier = pipeline("zero-shot-classification", model="facebook/bart-large-mnli")
    #     candidate_labels = [
    #         "Educational", "Entertainment", "Promotional", "News", "Documentary", 
    #         "Tutorial", "Vlog", "Review", "Comedy", 
    #         "Fitness", "Lifestyle", "Travel", "Motivational"
    #     ]
    #     result = classifier(text, candidate_labels)
    #     best_label = result['labels'][0]
    #     return best_label
    saved_clips = [] #clips file name will be stored
    def extract_clips_from_video(config):
        def process_clip(video_path, start_time, end_time, index):
            # Create the file name (without the directory)
            clip_file_name = f"clip_{index + 1}.mp4"
            print(clip_file_name)
            clip_file_path = os.path.join(config["output_folder"], clip_file_name)
            
            # Extract the clip and save it to the specified file path
            with VideoFileClip(video_path) as video:
                new_clip = video.subclip(start_time, end_time)
                new_clip.write_videofile(
                    clip_file_path,
                    codec="libx264",
                    preset="ultrafast",  # Use a faster preset
                    threads=1  # No need for multiple threads since it's not parallel
                )
            return clip_file_name  # Return just the file name, not the full path

        # Extract clips based on predefined timestamps
        transcriber = Transcriber()  # Assuming transcriber logic is already defined
        clipfinder = ClipFinder()    # Assuming clipfinder logic is already defined
        transcription = transcriber.transcribe(audio_file_path=config["video_file"])

        clips = clipfinder.find_clips(transcription=transcription)

        # Filter clips to ensure they are not longer than 90 seconds
        filtered_clips = [
            clip for clip in clips if (clip.end_time - clip.start_time) <= 90
        ]
        
        # Iterate over filtered clips and save just the file names
        for i, clip in enumerate(filtered_clips):
            clip_file_name = process_clip(config["video_file"], clip.start_time, clip.end_time, i)
            saved_clips.append(clip_file_name)  # Store file name in the array

        return saved_clips
   
   
    def clipMp4FilePath(config,filenameWithOutExt):
        return os.path.join(config["output_folder"], f"{filenameWithOutExt}.mp4")
    def clipAudioFilePath(config,filenameWithOutExt):
        return os.path.join(config["output_folder"], f"{filenameWithOutExt}_{config['audio_file']}")
    # def resize_video_if_needed(config,filenameWithOutExt):
    #     if config.get("cropping"):
            
    #         input_video = clipMp4FilePath(config,filenameWithOutExt) # replace with clip file
    #         output_video = os.path.join(config["output_folder"], f"{filenameWithOutExt}_cropped_video.mp4")
    #         # Resizing logic using clipsai
    #         video_file_path = os.path.abspath(input_video)
    #         output_file_path = os.path.abspath(output_video)

    #         # Resizing the video to the desired aspect ratio (9:16 here)
    #         crops = resize(
    #             video_file_path=video_file_path,
    #             pyannote_auth_token=config["pyannote_auth_token"],  # Change if required
    #             aspect_ratio=config["aspect_ratio"]  # Adjusted to 9:16 aspect ratio
    #         )

    #         # Log the crop segments for debugging
    #         print("Crops: ", crops.segments)

    #         # Initialize media editor
    #         media_editor = MediaEditor()

    #         # Assuming the file contains both audio and video streams
    #         media_file = AudioVideoFile(video_file_path)

    #         # Resize the video based on the crop information
    #         resized_video_file = media_editor.resize_video(
    #             original_video_file=media_file,
    #             resized_video_file_path=output_file_path,
    #             width=crops.crop_width,
    #             height=crops.crop_height,
    #             segments=crops.to_dict()["segments"],
    #         )

    #         print(f"Cropped video saved to: {output_file_path}")
    #         return output_file_path
    #     return None

    def extract_audio(config,filenameWithOutExt):
        # Ensure the audio file is saved in the correct directory
        audio_file_path = clipAudioFilePath(config,filenameWithOutExt)

        # Use ffmpeg to extract the audio and save it to the specified path
        ffmpeg.input(clipMp4FilePath(config,filenameWithOutExt)).output(audio_file_path).run()

        print(f"Audio extracted and saved at: {audio_file_path}")
        return audio_file_path

    def transcribe_audio(config,filenameWithOutExt):
        model = whisperx.load_model("large-v2", config["device"], compute_type=config["compute_type"])
        audio = whisperx.load_audio(clipAudioFilePath(config,filenameWithOutExt))
        return model.transcribe(audio, batch_size=config["batch_size"])

    def align_transcription(result, config,filenameWithOutExt):
        model_a, metadata = whisperx.load_align_model(language_code=result["language"], device=config["device"])
        return whisperx.align(result["segments"], model_a, metadata, clipAudioFilePath(config,filenameWithOutExt), device=config["device"], return_char_alignments=False)

    def diarization(result, config,filenameWithOutExt):
        diarize_model = whisperx.DiarizationPipeline(use_auth_token=config["pyannote_auth_token"], device=config["device"])
        diarize_segments = diarize_model(clipAudioFilePath(config,filenameWithOutExt))
        return whisperx.assign_word_speakers(diarize_segments, result)

    def detect_emotion(text):
        emotion_model = pipeline("text-classification", model="arpanghoshal/EmoRoBERTa", return_all_scores=True)
        result = emotion_model(text)
        emotion = max(result[0], key=lambda x: x['score'])['label'].lower()
        return emotion
    def generate_subtitles_with_emotions(segments, config,filenameWithOutExt):
        grouped_segments = []
        for segment in segments:
            words = segment["words"]
            index = 0

            while index < len(words):
                group_size = random.randint(config["min_words"], config["max_words"])
                group = words[index:index + group_size]
                valid_group = [word for word in group if 'start' in word and 'end' in word]

                if not valid_group:
                    index += group_size
                    continue

                start_time = valid_group[0]['start']
                end_time = valid_group[-1]['end']
                text = ' '.join([word['word'] for word in group])

                # Detect emotion for this group
                emotion = detect_emotion(text) if config['emoji'] else None
                
                grouped_segments.append({
                    "start": start_time,
                    "end": end_time,
                    "text": text,
                    "emotion": emotion,  # Store detected emotion only if emoji option is enabled
                    "words": group
                })
                index += group_size

        return grouped_segments

    # def generate_ass_highlighted(grouped_segments, config,filenameWithOutExt):
    #     ass_file_path = os.path.join(config["output_folder"], f"{filenameWithOutExt}_{config['ass_file']}")
    #     with open(ass_file_path, 'w', encoding='utf-8') as ass_file:
    #         # Basic header for ASS file
    #         ass_file.write("[Script Info]\n")
    #         ass_file.write("Title: AI Video Subtitles with Highlights\n")
    #         ass_file.write("ScriptType: v4.00+\n")
    #         ass_file.write("[V4+ Styles]\n")
    #         ass_file.write("Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\n")
            
    #         # Define two styles: Default and Highlighted
    #         font_config = config["font"]
    #         ass_file.write(f"Style: Default,{font_config['fontname']},{font_config['fontsize']},{font_config['primary_color']},&H00FFFFFF,{font_config['outline_color']},{font_config['back_color']},{font_config['bold']},{font_config['italic']},{font_config['underline']},{font_config['strike_out']},{font_config['scale_x']},{font_config['scale_y']},{font_config['spacing']},{font_config['angle']},{font_config['border_style']},{font_config['outline']},{font_config['shadow']},{font_config['alignment']},{font_config['margin_l']},{font_config['margin_r']},{font_config['margin_v']},{font_config['encoding']}\n")
    #         ass_file.write(f"Style: Highlighted,{font_config['fontname']},{font_config['fontsize']},{font_config['highlight_color']},&H00FFFFFF,{font_config['outline_color']},{font_config['highlight_bg_color']},{font_config['bold']},{font_config['italic']},{font_config['underline']},{font_config['strike_out']},{font_config['scale_x']},{font_config['scale_y']},{font_config['spacing']},{font_config['angle']},{font_config['border_style']},{font_config['outline']},{font_config['shadow']},{font_config['alignment']},{font_config['margin_l']},{font_config['margin_r']},{font_config['margin_v']},{font_config['encoding']}\n")
            
    #         ass_file.write("[Events]\n")
    #         ass_file.write("Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n")

    #         # Process each subtitle segment
    #         for segment in grouped_segments:
    #             words = segment["words"]
    #             for i, word in enumerate(words):
    #                 if 'start' not in word or 'end' not in word:
    #                     continue

    #                 start_time = word['start']
    #                 end_time = word['end']

    #                 # Highlight the current word with background
    #                 highlighted_text = ''
    #                 for j, w in enumerate(words):
    #                     if 'start' in w and 'end' in w:
    #                         if j == i:
    #                             highlighted_text += f"{{\\rHighlighted}}{w['word']} "
    #                         else:
    #                             highlighted_text += f"{{\\rDefault}}{w['word']} "

    #                 # Convert start and end time to ASS time format
    #                 start_ass_time = f"{int(start_time // 3600)}:{int((start_time % 3600) // 60)}:{start_time % 60:.2f}".replace('.', ',')
    #                 end_ass_time = f"{int(end_time // 3600)}:{int((end_time % 3600) // 60)}:{end_time % 60:.2f}".replace('.', ',')

    #                 # Write the event line for ASS
    #                 ass_file.write(f"Dialogue: 0,{start_ass_time},{end_ass_time},Default,,0,0,0,,{highlighted_text}\n")
            
    #         print(f"ASS file generated with background highlight: {ass_file_path}")
    def generate_srt_file(grouped_segments, config,filenameWithOutExt):
        srt_file_path = os.path.join(config["output_folder"], f"{filenameWithOutExt}_{config['srt_file']}")
        with open(srt_file_path, 'w', encoding='utf-8') as srt_file:
            for index, segment in enumerate(grouped_segments, start=1):
                start_time = segment['start']
                end_time = segment['end']

                # Convert to SRT time format
                start_srt_time = f"{int(start_time // 3600):02}:{int((start_time % 3600) // 60):02}:{start_time % 60:.3f}".replace('.', ',')
                end_srt_time = f"{int(end_time // 3600):02}:{int((end_time % 3600) // 60):02}:{end_time % 60:.3f}".replace('.', ',')

                srt_file.write(f"{index}\n{start_srt_time} --> {end_srt_time}\n{segment['text']}\n\n")
            
            print(f"SRT file generated: {srt_file_path}")

    def generate_srt_file_from_align_result(align_result, config, filenameWithOutExt):
        srt_file_path = os.path.join(config["output_folder"], f"{filenameWithOutExt}_{config['srt_file']}")
        
        # Open file in write mode
        with open(srt_file_path, 'w', encoding='utf-8') as srt_file:
            # Loop through each segment in align_result
            for index, segment in enumerate(align_result['segments'], start=1):
                start_time = segment['start']
                end_time = segment['end']
                text = segment['text']

                # Convert to SRT time format (HH:MM:SS,MMM)
                start_srt_time = f"{int(start_time // 3600):02}:{int((start_time % 3600) // 60):02}:{start_time % 60:.3f}".replace('.', ',')
                end_srt_time = f"{int(end_time // 3600):02}:{int((end_time % 3600) // 60):02}:{end_time % 60:.3f}".replace('.', ',')

                # Write SRT format (index, time, text)
                srt_file.write(f"{index}\n{start_srt_time} --> {end_srt_time}\n{text}\n\n")
        
        print(f"SRT file generated: {srt_file_path}")

  

    # def burn_subtitles(config,filenameWithOutExt):
    #     video_input_path = clipMp4FilePath(config,filenameWithOutExt)
    #     cropped_video_path = os.path.join(config["output_folder"], f"{filenameWithOutExt}_cropped_video.mp4")
    #     if config.get("cropping"):
    #         if os.path.exists(cropped_video_path):
    #             video_input_path = cropped_video_path
    #             print(f"Using cropped video for burning subtitles: {video_input_path}")
    #         else:
    #             print(f"Cropped video not found. Using original video.")
    #     ass_file_path = os.path.join(config["output_folder"], f"{filenameWithOutExt}_{config['ass_file']}")
    #     output_subtitled_video = os.path.join(config["output_folder"], f"{filenameWithOutExt}_{config['output_video']}")

    #     # Use ffmpeg to burn the subtitles into the video
    #     ffmpeg.input(video_input_path).output(output_subtitled_video, vf=f"subtitles={ass_file_path}").run()
    #     if config.get("cropping") and os.path.exists(cropped_video_path):
    #         os.remove(cropped_video_path)
    #         print(f"Cropped video deleted: {cropped_video_path}")
    #     print(f"Video with subtitles burned saved as: {output_subtitled_video}")

    #     return output_subtitled_video

    # def overlay_emotion_images_on_subtitled_video(grouped_segments, config, subtitled_video, filenameWithOutExt):
    #     if not config.get("emoji"):
    #         # Skip if emoji overlay is not enabled
    #         return subtitled_video

    #     output_video_path = os.path.join(config["output_folder"], f"{filenameWithOutExt}_{config['output_video']}")
    #     temp_output_path = os.path.join(config["output_folder"], f"{filenameWithOutExt}_temp_output.mp4")  # Temporary output file

    #     # Start building the filter_complex graph for ffmpeg using the subtitled video
    #     video_stream = ffmpeg.input(subtitled_video)
    #     current_stream = video_stream
    #     input_streams = [video_stream]

    #     # Preload the emotion PNG files upfront
    #     png_files = preload_emotion_images(config)

    #     # Loop through each segment and apply the corresponding overlay
    #     for index, segment in enumerate(grouped_segments):
    #         emotion = segment['emotion']
    #         start_time = segment['start']
    #         end_time = segment['end']

    #         # Check if the emotion has a preloaded PNG file
    #         if emotion in png_files:
    #             image_stream = png_files[emotion]  # Use the preloaded image
    #             input_streams.append(image_stream)

    #             # Set the position of the emoji overlay
    #             emoji_x = config.get("emoji_position", {}).get("x", "(W-w)/2")
    #             emoji_y = config.get("emoji_position", {}).get("y", "(H-h)/2")

    #             # Apply the overlay filter, enabling it between the start and end times of the segment
    #             current_stream = ffmpeg.overlay(current_stream, image_stream, x=emoji_x, y=emoji_y, enable=f"between(t,{start_time},{end_time})")

    #     # Apply the final overlay to the subtitled video and save it to the temporary path
    #     current_stream.output(temp_output_path).global_args('-loglevel', 'verbose').run()

    #     # Clean up: delete the old output file if it exists and rename the temporary file to the final output path
    #     if os.path.exists(output_video_path):
    #         os.remove(output_video_path)
    #     os.rename(temp_output_path, output_video_path)
    #     print(f"Final output video saved with overlays: {output_video_path}")

    #     return output_video_path
  
    # def add_background_music(subtitled_video, config,filenameWithOutExt,text): #text is transcription of video
    #     video_input = ffmpeg.input(subtitled_video)
    #     audio_input = ffmpeg.input(clipAudioFilePath(config,filenameWithOutExt))

    #     temp_output_path = os.path.join(config["output_folder"], f"{filenameWithOutExt}_temp_output.mp4")  # Temporary output file
    #     output_final = os.path.join(config["output_folder"], f"{filenameWithOutExt}_{config['output_video']}")  # Final output path

    #     # Check if background music is enabled
    #     if config["background_music"]:
    #         mp3FileName = classify_video_content(text)
    #         background_music = f"{config['music_file']}/{mp3FileName}.mp3"

    #         # Get video and background music duration
    #         video_duration = float(ffmpeg.probe(subtitled_video)['format']['duration'])
    #         music_duration = float(ffmpeg.probe(background_music)['format']['duration'])

    #         if music_duration < video_duration:
    #             # Loop the background music if it's shorter than the video
    #             looped_music = ffmpeg.input(background_music, stream_loop=-1, t=video_duration)
    #             merged_audio = ffmpeg.filter([audio_input, looped_music], 'amix', duration='longest', dropout_transition=2)
    #         else:
    #             # Trim the background music if it's longer than the video
    #             trimmed_music = ffmpeg.input(background_music, t=video_duration)
    #             merged_audio = ffmpeg.filter([audio_input, trimmed_music], 'amix', duration='longest', dropout_transition=2)

    #         # Save to the temporary output file
    #         ffmpeg.output(video_input['v'], merged_audio, temp_output_path).run()

    #         print(f"Temporary video with background music saved as: {temp_output_path}")
    #     else:
    #         # If background music is disabled, only use the original audio
    #         ffmpeg.output(video_input['v'], audio_input['a'], temp_output_path).run()

    #         print(f"Temporary video with original audio saved as: {temp_output_path}")

    #     # Check if the final output file already exists, and if so, delete it
    #     if os.path.exists(output_final):
    #         os.remove(output_final)
    #         print(f"Existing file '{output_final}' deleted.")

    #     # Rename the temporary output to the final output path
    #     os.rename(temp_output_path, output_final)
    #     print(f"Temporary file renamed to final output: {output_final}")

    #     return output_final
    extract_clips_from_video(config)
    for clip in saved_clips: #clip = filename i-e  clip_1.mp4
        filenameWithOutExt, _ = os.path.splitext(clip)  # filename = clip_1  -->removed .mp4 ext
        # cropped_video = resize_video_if_needed(config,filenameWithOutExt)
        extract_audio(config,filenameWithOutExt)
        result = transcribe_audio(config,filenameWithOutExt)
        aligned_result = align_transcription(result, config,filenameWithOutExt)
        generate_srt_file_from_align_result(aligned_result,config,filenameWithOutExt)
        
        diarized_result = diarization(aligned_result, config,filenameWithOutExt)
        generate_json_file_from_diarized_result(diarized_result, config, filenameWithOutExt)
        # grouped_segments = generate_subtitles_with_emotions(diarized_result["segments"], config,filenameWithOutExt)
        # print('result start============')
        # print(result)
        # print('result end============')
        # print('algin  result start============')
        # print(aligned_result)
        # print('algin result end============')

        print('diarized_result start============')
        print(diarized_result)
        print('diarized_result end============')


        # print('grouped_segments start============')
        # print(grouped_segments)
        # print('grouped_segments end============')
        # generate_ass_highlighted(grouped_segments, config,filenameWithOutExt)
        # generate_srt_file(grouped_segments, config,filenameWithOutExt)
        # subtitled_video = burn_subtitles(config,filenameWithOutExt)
        # final_output = overlay_emotion_images_on_subtitled_video(grouped_segments, config, subtitled_video,filenameWithOutExt)
        # text = " ".join([segment['text'] for segment in result['segments']])
        # formatted_text = f'"""{text}"""'
        # final_output_with_music_or_audio = add_background_music(final_output, config,filenameWithOutExt,formatted_text)
        # gc.collect()
        



 
def main():
    config = json.loads(sys.argv[1])
   
    videoProcessing(config)


if __name__ == "__main__":
    main()

 














