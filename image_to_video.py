# import requests

# API_URL = "https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-dev"
# headers = {"Authorization": "Bearer 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"}

# def query(payload):
# 	response = requests.post(API_URL, headers=headers, json=payload)
# 	return response.content
# image_bytes = query({
# 	"inputs": "Astronaut riding a horse",
# })
# # You can access the image with PIL.Image for example
# import io
# from PIL import Image
# image = Image.open(io.BytesIO(image_bytes))
# image.save("horse.png")




from huggingface_hub import InferenceClient

client = InferenceClient(api_key="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")

image_url = "https://cdn.britannica.com/61/93061-050-99147DCE/Statue-of-Liberty-Island-New-York-Bay.jpg"

for message in client.chat_completion(
	model="meta-llama/Llama-3.2-11B-Vision-Instruct",
	messages=[
		{
			"role": "user",
			"content": [
				{"type": "image_url", "image_url": {"url": image_url}},
				{"type": "text", "text": "Describe this image in one sentence."},
			],
		}
	],
	max_tokens=500,
	stream=True,
):
	print(message.choices[0].delta.content, end="")