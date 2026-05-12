# Copied from jove/src/model.py (question generator model)
import math

import torch
import torch.nn as nn


class PositionalEncoding(nn.Module):
    def __init__(self, d_model: int, max_len: int = 1024, dropout: float = 0.1):
        super().__init__()
        self.dropout = nn.Dropout(dropout)
        pe = torch.zeros(max_len, d_model)
        pos = torch.arange(max_len).unsqueeze(1).float()
        div = torch.exp(torch.arange(0, d_model, 2).float() * (-math.log(10000.0) / d_model))
        pe[:, 0::2] = torch.sin(pos * div)
        pe[:, 1::2] = torch.cos(pos * div)
        self.register_buffer("pe", pe.unsqueeze(0))  # (1, max_len, d_model)

    def forward(self, x):
        return self.dropout(x + self.pe[:, : x.size(1)])


class QuestionGeneratorModel(nn.Module):
    """
    Transformer Seq2Seq from scratch.
    Entrée  : tokens du contexte (domaine | type | niveau | theme)
    Sortie  : tokens du JSON (question + choix)
    """

    def __init__(
        self,
        vocab_size: int,
        d_model: int = 256,
        nhead: int = 8,
        num_encoder_layers: int = 4,
        num_decoder_layers: int = 4,
        dim_feedforward: int = 512,
        dropout: float = 0.1,
        max_len: int = 1024,
    ):
        super().__init__()
        self.d_model = d_model

        self.embedding = nn.Embedding(vocab_size, d_model, padding_idx=0)
        self.pos_enc = PositionalEncoding(d_model, max_len, dropout)

        self.transformer = nn.Transformer(
            d_model=d_model,
            nhead=nhead,
            num_encoder_layers=num_encoder_layers,
            num_decoder_layers=num_decoder_layers,
            dim_feedforward=dim_feedforward,
            dropout=dropout,
            batch_first=True,
        )

        self.fc_out = nn.Linear(d_model, vocab_size)

    def forward(self, src, tgt, src_key_padding_mask=None, tgt_key_padding_mask=None, tgt_mask=None):
        src_emb = self.pos_enc(self.embedding(src) * math.sqrt(self.d_model))
        tgt_emb = self.pos_enc(self.embedding(tgt) * math.sqrt(self.d_model))

        out = self.transformer(
            src_emb,
            tgt_emb,
            tgt_mask=tgt_mask,
            src_key_padding_mask=src_key_padding_mask,
            tgt_key_padding_mask=tgt_key_padding_mask,
        )
        return self.fc_out(out)

    def generate(self, src, tokenizer, max_new_tokens=512, device="cpu", temperature=0.7):
        self.eval()
        bos = tokenizer.token2id[tokenizer.BOS]
        eos = tokenizer.token2id[tokenizer.EOS]
        pad = tokenizer.token2id[tokenizer.PAD]

        src = src.to(device)
        generated = torch.tensor([[bos]], dtype=torch.long, device=device)

        with torch.no_grad():
            src_mask = src == pad

            for _ in range(max_new_tokens):
                seq_len = generated.size(1)
                tgt_mask = nn.Transformer.generate_square_subsequent_mask(seq_len, device=device)
                logits = self.forward(src, generated, src_key_padding_mask=src_mask, tgt_mask=tgt_mask)
                next_logits = logits[:, -1, :] / temperature
                probs = torch.softmax(next_logits, dim=-1)
                next_token = torch.multinomial(probs, 1)

                generated = torch.cat([generated, next_token], dim=1)
                if next_token.item() == eos:
                    break

        return tokenizer.decode(generated[0].tolist())

