import type { Session } from '../domain/models';
import VboParser from './vbo/index';

export interface ParseResult {
  session: Session;
  warnings: string[];
}

export interface FileParser {
  name: string;
  canParse(filename: string, firstLine: string): boolean;
  parse(filename: string, content: string): ParseResult;
}

const parsers: FileParser[] = [VboParser];

export function parseFile(filename: string, content: string): ParseResult {
  const firstLine = content.split('\n')[0] ?? '';
  const parser = parsers.find(p => p.canParse(filename, firstLine));
  if (!parser) {
    throw new Error(`No parser found for file: ${filename}`);
  }
  return parser.parse(filename, content);
}
