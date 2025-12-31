import {
  InteractionEditReplyOptions,
  InteractionReplyOptions,
  Message,
  MessagePayload,
} from "discord.js";
import SpyInstance = jest.SpyInstance;
import { CustomInteraction } from "../../../../../src/commands/interaction";
import { AuthMock } from "../../../../mocks/auth.mock";
import { AuthService } from "../../../../../src/services/auth";
import { RemoveAdminRoleCommand } from "../../../../../src/commands/scrims/admin/roles/remove-admin-role";

describe("Remove admin role", () => {
  let basicInteraction: CustomInteraction;

  let removeAdminRoleSpy: SpyInstance<
    Promise<string[]>,
    [roles: string[]],
    string
  >;
  let editReplySpy: SpyInstance<
    Promise<Message<boolean>>,
    [reply: string | InteractionEditReplyOptions | MessagePayload],
    string
  >;
  let followUpSpy: SpyInstance<
    Promise<Message<boolean>>,
    [reply: string | InteractionReplyOptions | MessagePayload],
    string
  >;

  const mockAuthService = new AuthMock();

  let command: RemoveAdminRoleCommand;

  beforeAll(() => {
    command = new RemoveAdminRoleCommand(mockAuthService as AuthService);

    basicInteraction = {
      options: {
        getRole: () => ({
          id: "discord role id",
        }),
      },
      editReply: jest.fn(),
      followUp: jest.fn(),
      deleteReply: jest.fn(),
    } as unknown as CustomInteraction;

    editReplySpy = jest.spyOn(basicInteraction, "editReply");
    editReplySpy.mockClear();
    followUpSpy = jest.spyOn(basicInteraction, "followUp");
    followUpSpy.mockClear();
    removeAdminRoleSpy = jest.spyOn(mockAuthService, "removeAdminRoles");
    removeAdminRoleSpy.mockClear();
  });

  it("Should add admin role", async () => {
    removeAdminRoleSpy.mockReturnValueOnce(Promise.resolve(["db id"]));
    await command.run(basicInteraction);
    expect(removeAdminRoleSpy).toHaveBeenCalledWith(["discord role id"]);
    expect(followUpSpy).toHaveBeenCalledWith(
      "Scrim bot admin role <@&discord role id> removed",
    );
  });

  it("Should reply with an error if auth service fails", async () => {
    removeAdminRoleSpy.mockImplementationOnce(() => {
      throw Error("The database fell asleep");
    });

    editReplySpy = jest.spyOn(basicInteraction, "editReply");
    await command.run(basicInteraction);
    expect(editReplySpy).toHaveBeenCalledWith(
      "Error while removing admin role. Error: The database fell asleep",
    );
  });
});
