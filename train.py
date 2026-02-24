
"""
NautiCAI - YOLOv8 Training Script
Trains underwater anomaly detection model on composite dataset
"""

from ultralytics import YOLO
import os
import yaml
import argparse


def verify_dataset(data_yaml_path):
    """Verify dataset structure before training"""
    with open(data_yaml_path, 'r') as f:
        data = yaml.safe_load(f)

    dataset_path = data['path']
    train_path = os.path.join(dataset_path, data['train'])
    val_path = os.path.join(dataset_path, data['val'])

    print(f"Dataset root: {dataset_path}")
    print(f"Train images: {train_path}")
    print(f"Val images:   {val_path}")

    # Count images
    train_imgs = len(os.listdir(train_path)) if os.path.exists(train_path) else 0
    val_imgs = len(os.listdir(val_path)) if os.path.exists(val_path) else 0

    print(f"\nTrain images found: {train_imgs}")
    print(f"Val images found:   {val_imgs}")

    if train_imgs == 0:
        print("\n⚠️  WARNING: No training images found!")
        print("Please download datasets and place images in dataset/images/train/")
        print("Recommended datasets:")
        print("  - SUIM:     https://github.com/xahidbuffon/SUIM")
        print("  - MaVeCoDD: https://data.mendeley.com/datasets/ry392rp8cj/1")
        print("  - Kaggle:   https://www.kaggle.com/datasets/ebrahim007/marine-corrosion-dataset")
        return False

    return True


def train_model(
    model_size='n',
    epochs=100,
    imgsz=640,
    batch=16,
    data_yaml='data.yaml',
    resume=False
):
    """
    Train YOLOv8 model

    Args:
        model_size: 'n' (nano), 's' (small), 'm' (medium)
        epochs: number of training epochs
        imgsz: input image size
        batch: batch size
        data_yaml: path to data config
        resume: resume from last checkpoint
    """

    print("=" * 60)
    print("  NautiCAI - YOLOv8 Training")
    print("=" * 60)

    # Verify dataset first
    if not verify_dataset(data_yaml):
        print("\nPlease add dataset images before training.")
        return None

    # Load pretrained YOLOv8 model
    model_name = f'yolov8{model_size}.pt'
    print(f"\nLoading model: {model_name}")
    model = YOLO(model_name)

    print(f"\nStarting training...")
    print(f"  Epochs:     {epochs}")
    print(f"  Image size: {imgsz}")
    print(f"  Batch size: {batch}")
    print(f"  Data:       {data_yaml}")

    # Train
    results = model.train(
        data=data_yaml,
        epochs=epochs,
        imgsz=imgsz,
        batch=batch,
        name='nauticai_detector',
        project='runs/train',
        pretrained=True,
        optimizer='AdamW',
        lr0=0.001,
        patience=20,           # Early stopping
        save=True,
        save_period=10,        # Save checkpoint every 10 epochs
        cache=False,
        device=0,              # GPU if available, else CPU
        workers=4,
        exist_ok=True,
        plots=True,            # Generate training plots
        rect=True,             # Rectangular training for pipeline images
        mosaic=1.0,            # Mosaic augmentation
        flipud=0.1,            # Vertical flip (pipelines can be any orientation)
        fliplr=0.5,            # Horizontal flip
        degrees=15.0,          # Rotation augmentation
        translate=0.1,
        scale=0.5,
        hsv_h=0.015,
        hsv_s=0.7,
        hsv_v=0.4,
    )

    print("\n✅ Training complete!")
    print(f"Best model saved at: runs/train/nauticai_detector/weights/best.pt")
    print("\nCopy best.pt to weights/ folder:")
    print("  cp runs/train/nauticai_detector/weights/best.pt weights/best.pt")

    return results


def evaluate_model(weights_path='weights/best.pt', data_yaml='data.yaml'):
    """Evaluate trained model and print metrics"""
    print("\nEvaluating model...")
    model = YOLO(weights_path)

    metrics = model.val(data=data_yaml)

    print("\n" + "=" * 60)
    print("  NautiCAI Model Evaluation Results")
    print("=" * 60)
    print(f"  mAP@50:       {metrics.box.map50:.4f}")
    print(f"  mAP@50-95:    {metrics.box.map:.4f}")
    print(f"  Precision:    {metrics.box.mp:.4f}")
    print(f"  Recall:       {metrics.box.mr:.4f}")
    print("=" * 60)

    return metrics


def export_model(weights_path='weights/best.pt'):
    """Export model to ONNX for edge deployment"""
    print("\nExporting model to ONNX for Jetson deployment...")
    model = YOLO(weights_path)

    # Export to ONNX
    model.export(format='onnx', imgsz=640, simplify=True)
    print("✅ ONNX export complete: weights/best.onnx")
    print("\nFor TensorRT on Jetson, run:")
    print("  /usr/src/tensorrt/bin/trtexec --onnx=best.onnx --saveEngine=best.engine --fp16")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='NautiCAI Training Script')
    parser.add_argument('--mode', type=str, default='train',
                        choices=['train', 'eval', 'export'],
                        help='train, eval, or export')
    parser.add_argument('--model', type=str, default='n',
                        choices=['n', 's', 'm'],
                        help='Model size: n=nano, s=small, m=medium')
    parser.add_argument('--epochs', type=int, default=100)
    parser.add_argument('--batch', type=int, default=16)
    parser.add_argument('--imgsz', type=int, default=640)
    parser.add_argument('--weights', type=str, default='weights/best.pt')

    args = parser.parse_args()

    if args.mode == 'train':
        train_model(
            model_size=args.model,
            epochs=args.epochs,
            batch=args.batch,
            imgsz=args.imgsz
        )
    elif args.mode == 'eval':
        evaluate_model(weights_path=args.weights)
    elif args.mode == 'export':
        export_model(weights_path=args.weights)