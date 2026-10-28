using Crestron.DeviceDrivers.EntityModel;
using Crestron.DeviceDrivers.EntityModel.Data;
using Crestron.DeviceDrivers.EntityModel.Logging;
using Crestron.DeviceDrivers.SDK;
using Crestron.DeviceDrivers.SDK.EntityModel;
using Crestron.DeviceDrivers.SDK.EntityModel.Attributes;
using System.Collections.Generic;

public class MyDriverEntity : ReflectedAttributeDriverEntity
{

    public MyDriverEntity(DriverControllerCreationArgs args, DriverImplementationResources resources) : base(DriverController.RootControllerId)
    {
        DataDrivenConfigurationControllerArgs cfgArgs = DataDrivenConfigurationControllerArgs.FromResources(args, resources, ControllerId);
        ConfigurationController = new DelegateDataDrivenConfigurationController(cfgArgs, ApplyConfigurationItems, null, null);

        var uiDefinition = UiDefinitionProperty.LoadFromDirectoryIfExists(args.DriverDataDirectoryPath, resources.InitLogger, LogEntryLevel.Error);
        if (uiDefinition != null)
        {
            AddProperty(uiDefinition, UiDefinitionProperty.Name, uiDefinition);
        }

        // Include the DoCommand executor
		var doCommand = new ExtensionDoCommandExecutor(GetCommand, resources.Logger);
		AddCommand(this, ExtensionDoCommandExecutor.CommandName, doCommand);

		// Include the SetPropertyValue executor
		var setPropertyValue = new ExtensionSetPropertyValueExecutor(GetCommand, resources.Logger);
		AddCommand(this, ExtensionSetPropertyValueExecutor.CommandName, setPropertyValue);
    }

    internal DataDrivenConfigurationController ConfigurationController { get; private set; }


    private ConfigurationItemErrors ApplyConfigurationItems(
        DataDrivenConfigurationController.ApplyConfigurationAction action,
        string stepId,
        IDictionary<string, DriverEntityValue?> values
    )
    {
        switch (action)
        {
            // In this case, we only have one step, so these are the same
            case DataDrivenConfigurationController.ApplyConfigurationAction.ApplyAll:
            case DataDrivenConfigurationController.ApplyConfigurationAction.ApplyStep:
                DriverEntityValue? value;
                string host;
                ushort port;

                // For initial configuration, host and port should always be specified or this should
                // return an error.
                // After initial configuration, if the user changes only one setting, then this will be
                // called with just the one new setting.
                bool hasHost = values.TryGetValue("_Host_", out value) && value.HasValue;
                if (hasHost)
                {
                    host = value.Value.GetValue<string>();
                }

                bool hasPort = values.TryGetValue("_Port_", out value) && value.HasValue;
                if (hasPort)
                {
                    port = (ushort)value.Value.GetValue<long>();
                }

                // TODO: Validate host, create transport
                // If host is invalid...
                // return new ConfigurationItemErrors(new Dictionary<string, string> { { "_Host_", "Invalid host name" } }, null);
                return null;

            case DataDrivenConfigurationController.ApplyConfigurationAction.ClearValues:
                // This happens when the user goes "back" to a previous step during configuration.
                // In our use case here, this is impossible since there's only one step.
                // This code is just provided for reference.
                // The dictionary of values will have items to clear.
                if (values.ContainsKey("_Host_"))
                {
                    // Destroy transport, await new values
                }
                break;
        }

        return null;
    }

    [EntityProperty]
	[EntityPropertyMetadata(ExtensionUiProperty = true)]
    public string ExampleProperty { get; private set; }

    [EntityCommand]
    public void ChangeExampleProperty()
    {
        SetExampleProperty(ExampleProperty == "Value 1" ? "Value 2" : "Value 1");
    }

    [EntityCommand(Id = "setExampleProperty", NameLocalizationKey = "SetExampleText")]
    public void SetExampleProperty(string value)
    {
        if (ExampleProperty != value)
        {
            ExampleProperty = value;
            NotifyPropertyChanged("exampleProperty", new DriverEntityValue(ExampleProperty));
        }
    }
}
