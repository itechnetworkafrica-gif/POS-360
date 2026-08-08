import type { IncomingMessage, ServerResponse } from "http";
import app from "../server/app";

type Handler = (req: IncomingMessage, res: ServerResponse) => void;

export default function handler(req: IncomingMessage, res: ServerResponse) {
  return (app as unknown as Handler)(req, res);
}
