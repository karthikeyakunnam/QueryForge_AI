from models.document import SourceCitation


def estimate_tokens(text: str) -> int:
    return max(1, len(text) // 4)


def trim_sources_to_budget(sources: list[SourceCitation], token_budget: int) -> list[SourceCitation]:
    selected: list[SourceCitation] = []
    used = 0
    for source in sorted(sources, key=lambda item: item.score, reverse=True):
        source_tokens = estimate_tokens(source.text)
        if selected and used + source_tokens > token_budget:
            continue
        if source_tokens > token_budget:
            ratio = max(0.1, token_budget / source_tokens)
            trimmed_text = source.text[: int(len(source.text) * ratio)]
            source = source.model_copy(update={"text": trimmed_text})
            source_tokens = estimate_tokens(trimmed_text)
        selected.append(source)
        used += source_tokens
    return selected
