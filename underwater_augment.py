import cv2
import numpy as np
import random


def simulate_green_water(image):
    img_float = image.astype(np.float32) / 255.0
    b, g, r = cv2.split(img_float)
    r = np.clip(r * 0.6, 0, 1)
    g = np.clip(g * 1.1, 0, 1)
    b = np.clip(b * 0.9, 0, 1)
    merged = cv2.merge([b, g, r])
    fog = np.full_like(merged, (0.0, 0.4, 0.0), dtype=np.float32)
    final = cv2.addWeighted(merged, 0.7, fog, 0.3, 0)
    return (final * 255).astype(np.uint8)


def simulate_turbidity(image, intensity='medium'):
    result = image.copy()
    if intensity == 'low':
        kernel_size = 3
        noise_factor = 0.05
    elif intensity == 'medium':
        kernel_size = 7
        noise_factor = 0.1
    else:
        kernel_size = 15
        noise_factor = 0.2
    result = cv2.GaussianBlur(result, (kernel_size, kernel_size), 0)
    noise = np.random.randn(*result.shape) * noise_factor * 255
    result = np.clip(result.astype(np.float32) + noise, 0, 255).astype(np.uint8)
    return result


def simulate_marine_snow(image, num_particles=150):
    result = image.copy()
    for _ in range(num_particles):
        x = random.randint(0, image.shape[1] - 1)
        y = random.randint(0, image.shape[0] - 1)
        radius = random.randint(1, 3)
        brightness = random.randint(180, 255)
        cv2.circle(result, (x, y), radius, (brightness, brightness, brightness), -1)
    return result


def apply_full_underwater_simulation(image, turbidity_level='medium', add_marine_snow=True):
    result = simulate_green_water(image)
    result = simulate_turbidity(result, intensity=turbidity_level)
    if add_marine_snow:
        result = simulate_marine_snow(result)
    return result


def apply_augmentation_for_training(image):
    if random.random() > 0.5:
        image = simulate_green_water(image)
    if random.random() > 0.5:
        intensity = random.choice(['low', 'medium', 'high'])
        image = simulate_turbidity(image, intensity=intensity)
    if random.random() > 0.5:
        particles = random.randint(50, 300)
        image = simulate_marine_snow(image, num_particles=particles)
    return image