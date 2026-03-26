import { joinSession } from "@github/copilot-sdk/extension";

const session = await joinSession({
    hooks: {
        onSessionStart: async () => {
            await session.log("example-skill loaded ✓");
        },
    },
    tools: [
        {
            name: "greet",
            description: "Returns a friendly greeting. Use this to say hello to someone by name.",
            parameters: {
                type: "object",
                properties: {
                    name: {
                        type: "string",
                        description: "The name of the person to greet",
                    },
                },
                required: ["name"],
            },
            handler: async (args) => {
                return `Hello, ${args.name}! 👋 This greeting was brought to you by the example-skill from CrestronAISkills.`;
            },
        },
    ],
});
