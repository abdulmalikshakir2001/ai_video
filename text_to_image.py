# import torch

# from diffusers import StableVideoDiffusionPipeline
# from diffusers.utils import load_image, export_to_video

# pipe = StableVideoDiffusionPipeline.from_pretrained(
#     "stabilityai/stable-video-diffusion-img2vid-xt", torch_dtype=torch.float16, variant="fp16"
# )
# pipe.enable_model_cpu_offload()

# # Load the conditioning image
# image = load_image("https://huggingface.co/datasets/huggingface/documentation-images/resolve/main/diffusers/svd/rocket.png")
# image = image.resize((1024, 576))

# generator = torch.manual_seed(42)
# frames = pipe(image, decode_chunk_size=8, generator=generator).frames[0]

# export_to_video(frames, "generated.mp4", fps=7)


# # import torch

# # print("Number of GPU: ", torch.cuda.device_count())
# # print("GPU Name: ", torch.cuda.get_device_name())


# # device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
# # print('Using device:', device)




# import torch
# from diffusers import DiffusionPipeline, DPMSolverMultistepScheduler
# from diffusers.utils import export_to_video

# # Load the pipeline
# pipe = DiffusionPipeline.from_pretrained("cerspense/zeroscope_v2_576w", torch_dtype=torch.float16)
# pipe.scheduler = DPMSolverMultistepScheduler.from_config(pipe.scheduler.config)
# pipe.enable_model_cpu_offload()

# # Define the prompt and generate the video frames
# prompt = "Darth Vader is surfing on waves"
# video_frames = pipe(prompt, num_inference_steps=40, height=320, width=576, num_frames=24).frames

# # Export the video to the current folder with a specified filename
# video_path = "./output_video.mp4"  # You can change the filename if desired
# export_to_video(video_frames, video_path)

# print(f"Video saved at {video_path}")

import torch
from diffusers import CogVideoXPipeline
from diffusers.utils import export_to_video

prompt = "A panda, dressed in a small, red jacket and a tiny hat, sits on a wooden stool in a serene bamboo forest. The panda's fluffy paws strum a miniature acoustic guitar, producing soft, melodic tunes. Nearby, a few other pandas gather, watching curiously and some clapping in rhythm. Sunlight filters through the tall bamboo, casting a gentle glow on the scene. The panda's face is expressive, showing concentration and joy as it plays. The background includes a small, flowing stream and vibrant green foliage, enhancing the peaceful and magical atmosphere of this unique musical performance."

pipe = CogVideoXPipeline.from_pretrained(
    "THUDM/CogVideoX-2b",
    torch_dtype=torch.float16
)

pipe.enable_model_cpu_offload()
pipe.enable_sequential_cpu_offload()
pipe.vae.enable_slicing()
pipe.vae.enable_tiling()
video = pipe(
    prompt=prompt,
    num_videos_per_prompt=1,
    num_inference_steps=50,
    num_frames=49,
    guidance_scale=6,
    generator=torch.Generator(device="cuda").manual_seed(42),
).frames[0]

export_to_video(video, "output.mp4", fps=8)
