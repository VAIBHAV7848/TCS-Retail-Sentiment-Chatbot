"""Unit tests for Preprocessing Agent."""

import pytest
from app.core.schemas import PreprocessInput
from app.agents.preprocess_agent import preprocess


def test_preprocess_normal_message():
    inp = PreprocessInput(raw_text="The product quality is AMAZING! Love it so much! 😊")
    out = preprocess(inp)
    assert "AMAZING" in out.clean_text  # Caps preserved
    assert "😊" in out.clean_text  # Emoji preserved
    assert "!" in out.clean_text  # Punctuation preserved
    assert out.language == "en"
    assert "empty_input" not in out.flags


def test_preprocess_empty_input():
    inp = PreprocessInput(raw_text="   \n\t  ")
    out = preprocess(inp)
    assert "empty_input" in out.flags
    assert out.clean_text == ""


def test_preprocess_html_stripping():
    inp = PreprocessInput(raw_text="<div><p>Terrible service <b>ever</b>!</p></div>")
    out = preprocess(inp)
    assert "<" not in out.clean_text
    assert "Terrible service ever!" in out.clean_text


def test_preprocess_oversize_truncation():
    long_text = "word " * 600  # 3000 chars
    inp = PreprocessInput(raw_text=long_text)
    out = preprocess(inp)
    assert len(out.clean_text) <= 2000
    assert "truncated" in out.flags


def test_preprocess_elongation_normalization():
    inp = PreprocessInput(raw_text="This is soooooooo bad and woooooow!")
    out = preprocess(inp)
    # Consecutive letters (>2) condensed to 2
    assert "soooo" not in out.clean_text
    assert "soo" in out.clean_text
