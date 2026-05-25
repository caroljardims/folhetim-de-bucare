import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { QueryDocumentSnapshot } from "firebase-admin/firestore";
import { speakerIdsFromChatDocs } from "./index.js";

function mockDoc(data: Record<string, unknown>): QueryDocumentSnapshot {
  return { data: () => data } as QueryDocumentSnapshot;
}

describe("speakerIdsFromChatDocs", () => {
  it("only counts non-vote messages for the requested day round", () => {
    const docs = [
      mockDoc({
        votesRound: 2,
        playerId: "bot-a",
        text: "Olá, cidade.",
        type: "chat",
      }),
      mockDoc({
        votesRound: 2,
        playerId: "bot-b",
        text: "Também falo.",
      }),
      mockDoc({
        votesRound: 2,
        playerId: "bot-c",
        type: "vote",
        text: "Fulano votou.",
      }),
    ];
    const spoke = speakerIdsFromChatDocs(docs, 2);
    assert.equal(spoke.size, 2);
    assert.ok(spoke.has("bot-a"));
    assert.ok(spoke.has("bot-b"));
    assert.ok(!spoke.has("bot-c"));
  });

  it("ignores messages from other day rounds", () => {
    const docs = [
      mockDoc({ votesRound: 1, playerId: "bot-a", text: "Dia anterior" }),
      mockDoc({ votesRound: 2, playerId: "bot-b", text: "Dia certo" }),
    ];
    const spoke = speakerIdsFromChatDocs(docs, 2);
    assert.equal(spoke.size, 1);
    assert.ok(!spoke.has("bot-a"));
    assert.ok(spoke.has("bot-b"));
  });

  it("silencio_suspeito: only bots with zero chat in round are silent", () => {
    const candidateBotIds = ["bot-a", "bot-b", "bot-c"];
    const docs = [
      mockDoc({ votesRound: 2, playerId: "bot-a", text: "msg" }),
      mockDoc({ votesRound: 2, playerId: "bot-b", text: "outra" }),
    ];
    const spoke = speakerIdsFromChatDocs(docs, 2);
    const silentBots = candidateBotIds.filter((id) => !spoke.has(id));
    assert.deepEqual(silentBots, ["bot-c"]);
  });
});
