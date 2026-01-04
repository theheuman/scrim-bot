import {
  InteractionEditReplyOptions,
  Message,
  MessagePayload,
  User,
} from "discord.js";
import SpyInstance = jest.SpyInstance;
import { CustomInteraction } from "../../../src/commands/interaction";
import { AuthMock } from "../../mocks/auth.mock";
import { OverstatService } from "../../../src/services/overstat";
import { OverstatServiceMock } from "../../mocks/overstat.mock";
import { AuthService } from "../../../src/services/auth";
import { GetUserCommand } from "../../../src/commands/overstat/get-user";
import { Player } from "../../../src/models/Player";

describe("Get user", () => {
  let basicInteraction: CustomInteraction;

  let getPlayerSpy: SpyInstance<
    Promise<Player | undefined>,
    [overstatLink: string],
    string
  >;
  let editReplySpy: SpyInstance<
    Promise<Message<boolean>>,
    [reply: string | InteractionEditReplyOptions | MessagePayload],
    string
  >;

  const mockAuthService = new AuthMock();
  const mockOverstatService = new OverstatServiceMock();

  let command: GetUserCommand;

  beforeAll(() => {
    command = new GetUserCommand(
      mockAuthService as AuthService,
      mockOverstatService as unknown as OverstatService,
    );

    basicInteraction = {
      options: {
        getString: () => "https://overstat.gg/player/12345/overview",
      },
      user: { id: "discord command user id" },
      member: { id: "discord member id" },
      editReply: jest.fn(),
      invisibleReply: jest.fn(),
    } as unknown as CustomInteraction;
  });

  beforeEach(() => {
    editReplySpy = jest.spyOn(basicInteraction, "editReply");
    editReplySpy.mockClear();
    getPlayerSpy = jest.spyOn(mockOverstatService, "getPlayerFromOverstatLink");
    getPlayerSpy.mockClear();
    jest
      .spyOn(mockAuthService, "memberIsAdmin")
      .mockImplementation((member) =>
        Promise.resolve(member.id === "discord admin id"),
      );
  });

  it("Should get player for a linked overstat", async () => {
    getPlayerSpy.mockReturnValueOnce(
      Promise.resolve({
        id: "db-uuid",
        discordId: "a valid discord id",
        displayName: "a valid discord displayName",
        overstatId: "12345",
      }),
    );
    await command.run(basicInteraction);
    expect(getPlayerSpy).toHaveBeenCalledWith(
      "https://overstat.gg/player/12345/overview",
    );
    expect(editReplySpy).toHaveBeenCalledWith(
      "https://overstat.gg/player/12345/overview is linked to <@a valid discord id>",
    );
  });

  it("Should reply that no user was found with overstat link", async () => {
    getPlayerSpy.mockReturnValueOnce(Promise.resolve(undefined));
    await command.run(basicInteraction);
    expect(getPlayerSpy).toHaveBeenCalledWith(
      "https://overstat.gg/player/12345/overview",
    );
    expect(editReplySpy).toHaveBeenCalledWith(
      "No user found with overstat: https://overstat.gg/player/12345/overview",
    );
  });

  describe("Errors", () => {
    it("Should reply with an error if overstat service fails", async () => {
      getPlayerSpy.mockImplementationOnce(() => {
        throw Error("Invalid overstat url");
      });

      await command.run(basicInteraction);
      expect(editReplySpy).toHaveBeenCalledWith(
        "Could not fetch user for overstat. Error: Invalid overstat url",
      );
    });
  });
});
