"""Read public reference card metadata; do not copy storefront source code."""
import json
from html.parser import HTMLParser
from pathlib import Path


class Cards(HTMLParser):
    def __init__(self):
        super().__init__()
        self.current = None
        self.cards = []
        self.capture = False

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'article' and 'data-hb-card' in attrs:
            self.current = {'handle': attrs.get('data-handle')}
        if self.current and tag == 'span' and 'hb-card__meta-finish' in attrs.get('class', '').split():
            self.capture = True

    def handle_data(self, text):
        if self.capture and self.current:
            self.current['color'] = text.strip().lower()

    def handle_endtag(self, tag):
        if tag == 'span':
            self.capture = False
        if tag == 'article' and self.current:
            self.cards.append(self.current)
            self.current = None


parser = Cards()
parser.feed(Path('/tmp/humbler-home.html').read_text())
print(json.dumps(parser.cards))
