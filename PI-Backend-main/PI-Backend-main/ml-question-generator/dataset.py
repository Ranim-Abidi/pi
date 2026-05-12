# Copied from jove/src/dataset.py (tokenizer + dataset)
import json

import torch
from torch.utils.data import Dataset


class QuestionTokenizer:
    """Tokenizer caractère par caractère — 100% custom, zéro dépendance LLM."""

    PAD, BOS, EOS, UNK = "<PAD>", "<BOS>", "<EOS>", "<UNK>"

    def __init__(self):
        self.token2id = {}
        self.id2token = {}

    def build_vocab(self, texts: list[str]):
        chars = set()
        for t in texts:
            chars.update(t)
        special = [self.PAD, self.BOS, self.EOS, self.UNK]
        vocab = special + sorted(chars)
        self.token2id = {c: i for i, c in enumerate(vocab)}
        self.id2token = {i: c for c, i in self.token2id.items()}
        print(f"Vocabulaire construit : {len(vocab)} tokens")

    def encode(self, text: str, max_len: int = 512) -> list[int]:
        ids = [self.token2id[self.BOS]]
        for ch in text:
            ids.append(self.token2id.get(ch, self.token2id[self.UNK]))
        ids.append(self.token2id[self.EOS])
        if len(ids) < max_len:
            ids += [self.token2id[self.PAD]] * (max_len - len(ids))
        return ids[:max_len]

    def decode(self, ids: list[int]) -> str:
        skip = {self.token2id.get(s) for s in [self.PAD, self.BOS, self.EOS]}
        return "".join(self.id2token.get(i, "") for i in ids if i not in skip)

    def save(self, path: str):
        with open(path, "w", encoding="utf-8") as f:
            json.dump(self.token2id, f, ensure_ascii=False)

    @classmethod
    def load(cls, path: str):
        t = cls()
        with open(path, encoding="utf-8") as f:
            t.token2id = json.load(f)
        t.id2token = {int(v): k for k, v in t.token2id.items()}
        return t


class QuestionDataset(Dataset):
    def __init__(self, filepath: str, tokenizer: QuestionTokenizer, input_len=128, output_len=512):
        with open(filepath, encoding="utf-8") as f:
            self.data = json.load(f)
        self.tokenizer = tokenizer
        self.input_len = input_len
        self.output_len = output_len

    def __len__(self):
        return len(self.data)

    def __getitem__(self, idx):
        item = self.data[idx]
        src = torch.tensor(self.tokenizer.encode(item["input"], self.input_len), dtype=torch.long)
        tgt = torch.tensor(self.tokenizer.encode(item["output"], self.output_len), dtype=torch.long)
        return src, tgt

