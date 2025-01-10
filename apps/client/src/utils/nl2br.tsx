const newlineRegex = /(\r\n|\r|\n)/g;

export function nl2br(text: string | undefined) {
  return text
    ?.split(newlineRegex)
    .map((line, index) =>
      line.match(newlineRegex) ? <br key={index} /> : line,
    );
}
