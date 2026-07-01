import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'workers'))
from process_telegram_v2 import format_as_markdown, clean_text


def test_paragraph_breaks_preserved():
    """Les blocs séparés par \\n\\n restent deux paragraphes distincts."""
    text = "Bloc un\n\nBloc deux"
    result = format_as_markdown(text)
    assert result == "Bloc un\n\nBloc deux", repr(result)


def test_single_newline_becomes_hard_break():
    """Un \\n simple à l'intérieur d'un bloc devient un hard line break Markdown (  \\n)."""
    text = "Titre\nCorps du texte"
    result = format_as_markdown(text)
    assert result == "Titre  \nCorps du texte", repr(result)


def test_mixed_breaks():
    """Structure titre+corps séparé par \\n\\n entre sections, \\n dans chaque section."""
    text = (
        "Le sommeil est essentiel\nIl faut dormir après.\n\n"
        "Régularité plutôt qu'intensité\nPratiquer tous les soirs."
    )
    result = format_as_markdown(text)
    expected = (
        "Le sommeil est essentiel  \nIl faut dormir après.\n\n"
        "Régularité plutôt qu'intensité  \nPratiquer tous les soirs."
    )
    assert result == expected, repr(result)


def test_markdown_bold_preserved():
    """Les marqueurs Markdown (**) ne sont pas détruits par clean_text."""
    text = "**Titre important**\nCorps du message."
    cleaned = clean_text(text)
    result = format_as_markdown(cleaned)
    assert "**Titre important**" in result, repr(result)


def test_clean_text_preserves_blank_lines():
    """clean_text ne doit PAS fusionner les lignes vides (séparateurs de paragraphe).

    Régression : le motif `\\s+\\n` avalait les `\\n\\n` car `\\s` inclut `\\n`.
    """
    text = "Paragraphe un.\n\nParagraphe deux."
    cleaned = clean_text(text)
    assert cleaned == "Paragraphe un.\n\nParagraphe deux.", repr(cleaned)


def test_full_pipeline_keeps_paragraphs():
    """Chaîne réelle clean_text → format_as_markdown : les paragraphes survivent.

    Reproduit le bug observé dans l'atelier (posts Telegram fusionnés en un seul
    bloc) : les sections séparées par une ligne vide dans Telegram doivent rester
    des paragraphes distincts après nettoyage.
    """
    text = (
        "Le sommeil est essentiel\nIl faut dormir après.\n\n"
        "Régularité plutôt qu'intensité\nPratiquer tous les soirs."
    )
    result = format_as_markdown(clean_text(text))
    expected = (
        "Le sommeil est essentiel  \nIl faut dormir après.\n\n"
        "Régularité plutôt qu'intensité  \nPratiquer tous les soirs."
    )
    assert result == expected, repr(result)


def test_clean_text_strips_trailing_whitespace():
    """L'intention d'origine (retirer les espaces en fin de ligne) est conservée."""
    text = "Ligne avec espaces   \nLigne suivante"
    cleaned = clean_text(text)
    assert cleaned == "Ligne avec espaces\nLigne suivante", repr(cleaned)
