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




import torch
from diffusers import DiffusionPipeline, DPMSolverMultistepScheduler
from diffusers.utils import export_to_video

# load pipeline
pipe = DiffusionPipeline.from_pretrained("damo-vilab/text-to-video-ms-1.7b", torch_dtype=torch.float16, variant="fp16")
pipe.scheduler = DPMSolverMultistepScheduler.from_config(pipe.scheduler.config)

# optimize for GPU memory
pipe.enable_model_cpu_offload()
pipe.enable_vae_slicing()

# generate
prompt = "Spiderman is surfing. Darth Vader is also surfing and following Spiderman"
video_frames = pipe(prompt, num_inference_steps=25, num_frames=200).frames

# convent to video
video_path = export_to_video(video_frames)
print(video_path)
