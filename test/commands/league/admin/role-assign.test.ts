import { CustomInteraction } from "../../../../src/commands/interaction";
import SpyInstance = jest.SpyInstance;
import {
  GuildMember,
  GuildMemberRoleManager,
  InteractionEditReplyOptions,
  InteractionReplyOptions,
  Message,
  MessagePayload,
  ReadonlyCollection,
  Role,
  RoleResolvable,
} from "discord.js";
import { AuthMock } from "../../../mocks/auth.mock";
import { RoleAssignmentCommand } from "../../../../src/commands/league/admin/role-assign";
import { AuthService } from "../../../../src/services/auth";

describe("Assign roles", () => {
  let basicInteraction: CustomInteraction;

  let addRoleSpy: SpyInstance<
    Promise<GuildMember>,
    [
      roleOrRoles:
        | RoleResolvable
        | readonly RoleResolvable[]
        | ReadonlyCollection<string, Role>,
      reason?: string | undefined,
    ],
    string
  >;
  let memberFetchSpy: SpyInstance<Promise<GuildMember>, [id: string], string>;
  let editReplySpy: SpyInstance<
    Promise<Message<boolean>>,
    [argument: string | MessagePayload | InteractionEditReplyOptions],
    string
  >;
  let followupSpy: SpyInstance<
    Promise<Message<boolean>>,
    [reply: string | InteractionReplyOptions | MessagePayload],
    string
  >;

  const mockAuthService = new AuthMock();

  let command: RoleAssignmentCommand;
  let returnedRole: Role;

  beforeAll(() => {
    command = new RoleAssignmentCommand(mockAuthService as AuthService);
    returnedRole = {
      id: "discord role id",
      name: "Division 1",
      editable: true,
    } as Role;
    basicInteraction = {
      options: {
        getRole: () => returnedRole,
        getString: jest.fn(),
      },
      reply: jest.fn(),
      invisibleReply: jest.fn(),
      followUp: jest.fn(),
      editReply: jest.fn(),
      guild: {
        members: {
          fetch: jest.fn(),
        },
      },
    } as unknown as CustomInteraction;

    editReplySpy = jest.spyOn(basicInteraction, "editReply");
    followupSpy = jest.spyOn(basicInteraction, "followUp");
    jest
      .spyOn(basicInteraction.options, "getString")
      .mockReturnValue("123 456,,789");
  });

  beforeEach(() => {
    if (!basicInteraction.guild) {
      fail("Guild on interaction not set");
    }

    const fakeMember: GuildMember = {
      roles: {
        add: jest.fn(),
      } as unknown as GuildMemberRoleManager,
    } as GuildMember;

    memberFetchSpy = jest.spyOn(
      basicInteraction.guild.members,
      "fetch",
    ) as SpyInstance;
    memberFetchSpy.mockReturnValue(Promise.resolve(fakeMember));
    addRoleSpy = jest.spyOn(fakeMember.roles, "add");
    memberFetchSpy.mockClear();
    addRoleSpy.mockClear();
    editReplySpy.mockClear();
    followupSpy.mockClear();
  });

  it("Should add role to user", async () => {
    await command.run(basicInteraction);
    expect(memberFetchSpy.mock.calls).toEqual([["123"], ["456"], ["789"]]);
    expect(addRoleSpy.mock.calls).toEqual([
      [
        {
          id: "discord role id",
          name: "Division 1",
          editable: true,
        },
      ],
      [
        {
          id: "discord role id",
          name: "Division 1",
          editable: true,
        },
      ],
      [
        {
          id: "discord role id",
          name: "Division 1",
          editable: true,
        },
      ],
    ]);
    expect(followupSpy).toHaveBeenCalledWith(
      "Successfully added the role to 3 member(s).",
    );
  });

  it("Should reply with an error if discord add fails", async () => {
    let count = -1;
    addRoleSpy.mockImplementation(() => {
      count++;
      if (count === 1) {
        throw Error("Discord hates you");
      } else {
        return Promise.resolve({} as GuildMember);
      }
    });

    await command.run(basicInteraction);

    expect(followupSpy).toHaveBeenCalledWith(
      "Successfully added the role to 2 member(s).\nFailed to add to 1: 456",
    );
  });

  it("Should reply with an error if no roles were added", async () => {
    jest.spyOn(basicInteraction.options, "getString").mockReturnValueOnce("");

    await command.run(basicInteraction);

    expect(followupSpy).toHaveBeenCalledWith("Failed to add role to any users");
  });

  it("Should reply with an error if no roles were added and there were failures", async () => {
    addRoleSpy.mockImplementation(() => {
      throw Error("Discord hates you");
    });

    await command.run(basicInteraction);

    expect(followupSpy).toHaveBeenCalledWith(
      "Failed to add role to any users\nFailed to add to 3: 123, 456, 789",
    );
  });
});
