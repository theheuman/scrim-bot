import {
  InteractionEditReplyOptions,
  Message,
  MessagePayload,
} from "discord.js";
import SpyInstance = jest.SpyInstance;
import { CustomInteraction } from "../../../../src/commands/interaction";
import { AuthMock } from "../../../mocks/auth.mock";
import { AuthService } from "../../../../src/services/auth";
import { AddAdminRoleCommand } from "../../../../src/commands/admin/roles/add-admin-role";
import { DiscordRole } from "../../../../src/models/Role";

describe("Add admin role", () => {
  let basicInteraction: CustomInteraction;

  let addAdminRoleSpy: SpyInstance<
    Promise<string[]>,
    [roles: DiscordRole[]],
    string
  >;
  let editReplySpy: SpyInstance<
    Promise<Message<boolean>>,
    [reply: string | InteractionEditReplyOptions | MessagePayload],
    string
  >;

  const mockAuthService = new AuthMock();

  let command: AddAdminRoleCommand;

  beforeAll(() => {
    command = new AddAdminRoleCommand(mockAuthService as AuthService);

    basicInteraction = {
      options: {
        getRole: () => ({
          id: "discord role id",
        }),
      },
      editReply: jest.fn(),
    } as unknown as CustomInteraction;

    addAdminRoleSpy = jest.spyOn(mockAuthService, "addAdminRoles");
    addAdminRoleSpy.mockClear();
  });

  it("Should add admin role", async () => {
    addAdminRoleSpy.mockReturnValue(Promise.resolve(["db id"]));
    await command.run(basicInteraction);
    expect(addAdminRoleSpy).toHaveBeenCalledWith(["discord role id"]);
    expect(editReplySpy).toHaveBeenCalledWith(
      "Scrim bot admin role <@discord role id> added",
    );
  });

  it("Should reply with an error if auth service fails", async () => {
    addAdminRoleSpy.mockImplementation(() => {
      return Promise.reject("The database fell asleep");
    });

    editReplySpy = jest.spyOn(basicInteraction, "editReply");
    await command.run(basicInteraction);
    expect(editReplySpy).toHaveBeenCalledWith(
      "Error while adding admin role. Error: The database fell asleep",
    );
  });
});
