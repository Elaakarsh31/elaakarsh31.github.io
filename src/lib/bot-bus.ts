// Tiny bridge between the DOM (palette, speech tag) and the 3D bot.
import { portfolio } from '../content/portfolio';

let index = 0;
let present = false;

export function nextBotLine() {
  const lines = portfolio.bot.lines;
  const line = lines[index % lines.length];
  index++;
  return line;
}

/** The bot is on screen and can answer a poke itself. */
export const botPresent = () => present;
export function setBotPresent(v: boolean) {
  present = v;
}

/** Asks the bot to spin and say its next line. Returns the line. */
export function pokeBot() {
  const line = nextBotLine();
  window.dispatchEvent(new CustomEvent('bot:poke', { detail: line }));
  return line;
}

/** Name shown with the bot's lines; empty means no name anywhere. */
export const botName = () => portfolio.bot.name.trim();
