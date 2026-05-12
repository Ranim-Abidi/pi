# Copied from jove/src/train.py (model training)
import json
import os
import random
from pathlib import Path

import torch
import torch.nn as nn
from torch.utils.data import DataLoader, random_split

from dataset import QuestionDataset, QuestionTokenizer
from model import QuestionGeneratorModel


BASE_DIR = Path(__file__).resolve().parent

# By default, point to the Angular dataset (keeps behavior identical after moving).
# You can override by setting QUESTIONS_DATA_DIR to another folder.
DEFAULT_DATA_DIR = os.getenv("QUESTIONS_DATA_DIR", "").strip()

if DEFAULT_DATA_DIR:
    data_dir = Path(DEFAULT_DATA_DIR)
else:
    data_dir = (
        Path(r"C:\Users\user\Desktop\projet integré\themeforest-OmXxesDy-jove-angular-job-board-template\jove\src\app\Nesrineai\data")
    )

SEED_DATA_PATH = data_dir / "questions.json"
EXPANDED_DATA_PATH = data_dir / "questions_expanded.json"

CFG = {
    "data_path": EXPANDED_DATA_PATH if EXPANDED_DATA_PATH.exists() else SEED_DATA_PATH,
    "vocab_path": BASE_DIR / "saved_model" / "vocab.json",
    "model_path": BASE_DIR / "saved_model" / "model.pt",
    "d_model": 256,
    "nhead": 8,
    "enc_layers": 4,
    "dec_layers": 4,
    "ff_dim": 512,
    "dropout": 0.1,
    "input_len": 128,
    "output_len": 512,
    "batch_size": 16,
    "epochs": 50,
    "lr": 1e-4,
    "val_split": 0.1,
    "seed": 42,
    "early_stopping_patience": 8,
}


def _set_seed(seed: int):
    random.seed(seed)
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(seed)


def _build_causal_mask(seq_len: int, device: str) -> torch.Tensor:
    return torch.triu(torch.ones((seq_len, seq_len), dtype=torch.bool, device=device), diagonal=1)


def train():
    device = "cuda" if torch.cuda.is_available() else "cpu"
    _set_seed(int(CFG["seed"]))
    print(f"Device : {device}")
    os.makedirs(Path(CFG["vocab_path"]).parent, exist_ok=True)

    if not Path(CFG["data_path"]).exists():
        raise FileNotFoundError(f"Dataset introuvable: {CFG['data_path']}")
    print(f"Dataset utilisé : {CFG['data_path']}")

    with open(CFG["data_path"], encoding="utf-8") as f:
        raw = json.load(f)
    all_texts = [d["input"] + d["output"] for d in raw]

    tokenizer = QuestionTokenizer()
    tokenizer.build_vocab(all_texts)
    tokenizer.save(str(CFG["vocab_path"]))

    dataset = QuestionDataset(str(CFG["data_path"]), tokenizer, CFG["input_len"], CFG["output_len"])
    val_size = max(1, int(len(dataset) * CFG["val_split"]))
    if len(dataset) <= 1:
        raise ValueError("Dataset trop petit: au moins 2 exemples requis.")
    train_size = max(1, len(dataset) - val_size)
    val_size = len(dataset) - train_size
    split_generator = torch.Generator().manual_seed(int(CFG["seed"]))
    train_ds, val_ds = random_split(dataset, [train_size, val_size], generator=split_generator)

    train_loader = DataLoader(train_ds, batch_size=CFG["batch_size"], shuffle=True)
    val_loader = DataLoader(val_ds, batch_size=CFG["batch_size"])

    model = QuestionGeneratorModel(
        vocab_size=len(tokenizer.token2id),
        d_model=CFG["d_model"],
        nhead=CFG["nhead"],
        num_encoder_layers=CFG["enc_layers"],
        num_decoder_layers=CFG["dec_layers"],
        dim_feedforward=CFG["ff_dim"],
        dropout=CFG["dropout"],
    ).to(device)

    print(f"Paramètres : {sum(p.numel() for p in model.parameters()):,}")

    pad_id = tokenizer.token2id[tokenizer.PAD]
    criterion = nn.CrossEntropyLoss(ignore_index=pad_id)
    optimizer = torch.optim.Adam(model.parameters(), lr=CFG["lr"])
    scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(optimizer, patience=5, factor=0.5)

    best_val_loss = float("inf")
    no_improve_epochs = 0

    for epoch in range(1, CFG["epochs"] + 1):
        model.train()
        train_loss = 0.0

        for src, tgt in train_loader:
            src, tgt = src.to(device), tgt.to(device)
            tgt_in = tgt[:, :-1]
            tgt_out = tgt[:, 1:]

            seq_len = tgt_in.size(1)
            tgt_mask = _build_causal_mask(seq_len, device)
            src_pad = src == pad_id
            tgt_pad = tgt_in == pad_id

            logits = model(
                src,
                tgt_in,
                src_key_padding_mask=src_pad,
                tgt_key_padding_mask=tgt_pad,
                tgt_mask=tgt_mask,
            )

            loss = criterion(logits.reshape(-1, len(tokenizer.token2id)), tgt_out.reshape(-1))
            optimizer.zero_grad()
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            optimizer.step()
            train_loss += loss.item()

        train_loss /= len(train_loader)

        model.eval()
        val_loss = 0.0
        with torch.no_grad():
            for src, tgt in val_loader:
                src, tgt = src.to(device), tgt.to(device)
                tgt_in = tgt[:, :-1]
                tgt_out = tgt[:, 1:]
                seq_len = tgt_in.size(1)
                tgt_mask = _build_causal_mask(seq_len, device)
                logits = model(
                    src,
                    tgt_in,
                    tgt_mask=tgt_mask,
                    src_key_padding_mask=src == pad_id,
                    tgt_key_padding_mask=tgt_in == pad_id,
                )
                val_loss += criterion(logits.reshape(-1, len(tokenizer.token2id)), tgt_out.reshape(-1)).item()

        val_loss /= max(1, len(val_loader))
        scheduler.step(val_loss)

        print(f"Epoch {epoch:3d}/{CFG['epochs']} | Train loss: {train_loss:.4f} | Val loss: {val_loss:.4f}")

        if val_loss < best_val_loss:
            best_val_loss = val_loss
            no_improve_epochs = 0
            torch.save(model.state_dict(), str(CFG["model_path"]))
            print(f"  => Meilleur modèle sauvegardé (val_loss={val_loss:.4f})")
        else:
            no_improve_epochs += 1

        if no_improve_epochs >= int(CFG["early_stopping_patience"]):
            print(f"Early stopping activé à l'epoch {epoch}.")
            break

    print("Entraînement terminé.")


if __name__ == "__main__":
    train()

