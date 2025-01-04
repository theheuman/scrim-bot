# Commands
## How commands work

* All commands are imported and instantiated in the command array in the index.ts file
* That array is imported in 
  * deploy-commands
    * use `npm run deploy-commands` to deploy the commands to discord so it can correctly prompt users for parameters
  * the main entry file
    * takes an event and executes the correct commands `run` method with the interaction discord recorded

## Adding a command

* Each command has its own file so create a new one in an intuitive place, create new directories if necessary
* Add your command to the command array in src/commands/index.ts
* Each command must extend the AdminCommand or MemberCommand class which provides some useful abstractions and methods to implement
* in your constructor
  * inject services you intend to use (authService is required if AdminCommand)
  * call the super constructor with your name and description
  * add all the inputs necessary for your command by using the applicable parent methods or by adding new parent methods where necessary
    * required inputs must be added first
* in your run method you must reply within 3 seconds so discord doesn't trash your interaction
  * if you're doing async work you should reply with a generic message saying "working on your request" or something of the like

admin command example: 
```
import { Command } from "../../command";
import { CustomInteraction } from "../../interaction";

export class NameOfYourCommand extends AdminCommand {
  inputNames = {
    user: "userinput",
    string: "stringinput",
    number: "numberinput",
  };

  constructor(authService: AuthService, private service: ServiceToInject) {
    super(authService, "command-name", "command description");
    this.addUserInput(this.inputNames.user, "Input a user", optionalRequiredBoolean);
    this.addStringInput(this.inputNames.string, "Input a string");
    this.addNumberInput(
      this.inputNames.number,
      "Input a number",
      true,
    );
  }

  async run(interaction: CustomInteraction) {
    const user: User = interaction.options.getUser(this.inputNames.user, includeBooleanHereIfInputWasRequired);
    const numberInput: number | null = interaction.options.getNumber(this.inputNames.number);
    const stringInput: string = interaction.options.getString(this.inputNames.string
    
    interaction.reply("Got your command, working on it!"
    await this.service.someMethod()
    interaction.editReply("useful information about the work that was executed")
  }
}

```
