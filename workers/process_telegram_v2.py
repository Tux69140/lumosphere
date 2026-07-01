#!/usr/bin/env python3
"""
Lumosphère — Worker Telegram v2
Entrée : JSON stdin (liste de messages bruts + config)
Sortie : JSON stdout (messages nettoyés/enrichis en Markdown)
Pattern : PHP exec() → Python worker → JSON stdout → PHP parse

Adapté de pretraitement/serveur/epuriel/workers/process_telegram_v1.py
"""

import json
import re
import sys

HASHTAG_RE = re.compile(r"(^|\s)#([\wÀ-ÖØ-öø-ÿ-]+)", re.UNICODE)


def clean_text(text: str) -> str:
    """Nettoyer le texte d'un message Telegram."""
    if not text:
        return ""
    # Extraire les hashtags avant nettoyage
    text = HASHTAG_RE.sub(" ", text)
    # Normaliser les espaces
    text = re.sub(r"[ \t]+", " ", text)
    # Retirer les espaces/tabulations en fin de ligne SANS toucher aux lignes
    # vides : `\s` engloberait `\n` et fusionnerait les séparateurs de paragraphe.
    text = re.sub(r"[ \t]+\n", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def extract_hashtag_keywords(text: str, entities: list | None = None) -> list[str]:
    """Extraire les mots-clés depuis les hashtags."""
    keywords = set()

    # Depuis les entités Telegram
    if entities:
        for ent in entities:
            if ent.get("type") == "hashtag" and ent.get("text"):
                kw = ent["text"].lstrip("#").strip()
                if kw:
                    keywords.add(kw.lower())

    # Depuis le texte (regex)
    for match in HASHTAG_RE.finditer(text or ""):
        kw = match.group(2).strip()
        if kw:
            keywords.add(kw.lower())

    return sorted(keywords)


def format_as_markdown(text: str) -> str:
    """Formater un message nettoyé en Markdown basique.

    Les blocs séparés par une ligne vide (\\n\\n) deviennent des paragraphes.
    Les sauts de ligne simples (\\n) dans un bloc deviennent des hard line breaks
    CommonMark (deux espaces + \\n) pour préserver la mise en forme visuelle.
    """
    if not text:
        return ""
    lines = text.split("\n")
    result = []
    for line in lines:
        stripped = line.strip()
        result.append(stripped)

    # Diviser en blocs (séparés par lignes vides), appliquer hard breaks à l'intérieur
    paragraphs = []
    current_block: list[str] = []
    for line in result:
        if not line:
            if current_block:
                paragraphs.append("  \n".join(current_block))
                current_block = []
        else:
            current_block.append(line)
    if current_block:
        paragraphs.append("  \n".join(current_block))

    return "\n\n".join(paragraphs)


def validate_anti_summarization(original: str, cleaned: str) -> bool:
    """Garde anti-résumé : le texte nettoyé ne doit pas être >20% plus court."""
    if not original:
        return True
    orig_len = len(original.strip())
    if orig_len == 0:
        return True
    clean_len = len(cleaned.strip())
    return clean_len >= orig_len * 0.8


def process_message(msg: dict) -> dict | None:
    """Traiter un seul message Telegram."""
    text = msg.get("text", "")
    caption = msg.get("caption", "")
    full_text = "\n\n".join(filter(None, [text, caption]))

    if not full_text.strip():
        return None

    entities = msg.get("entities", [])
    source_keywords = extract_hashtag_keywords(full_text, entities)
    cleaned = clean_text(full_text)
    markdown = format_as_markdown(cleaned)

    return {
        "message_id": msg.get("message_id"),
        "date": msg.get("date"),
        "chat_id": msg.get("chat_id"),
        "chat_username": msg.get("chat_username"),
        "contenu_brut": full_text.strip(),
        "contenu_nettoye": markdown,
        "source_keywords": source_keywords,
        "selected": True,
    }


def main():
    try:
        raw_input = sys.stdin.read()
        if not raw_input.strip():
            output_error("Aucune donnée reçue sur stdin.")
            return

        payload = json.loads(raw_input)
        messages = payload.get("messages", [])
        job_id = payload.get("job_id", "unknown")

        if not messages:
            output_error("Aucun message à traiter.")
            return

        processed = []
        skipped = 0

        for msg in messages:
            result = process_message(msg)
            if result is None:
                skipped += 1
                continue
            processed.append(result)

        output = {
            "ok": True,
            "job_id": job_id,
            "segments": processed,
            "stats": {
                "total_messages": len(messages),
                "processed": len(processed),
                "skipped_empty": skipped,
            },
        }
        print(json.dumps(output, ensure_ascii=False))

    except json.JSONDecodeError as e:
        output_error(f"JSON invalide sur stdin : {e}")
    except Exception as e:
        output_error(f"Erreur inattendue : {e}")


def output_error(message: str):
    print(json.dumps({"ok": False, "error": message}, ensure_ascii=False))


if __name__ == "__main__":
    main()
