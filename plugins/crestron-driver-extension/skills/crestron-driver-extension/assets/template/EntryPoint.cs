using Crestron.DeviceDrivers.EntityModel;
using Crestron.DeviceDrivers.SDK;
using Crestron.DeviceDrivers.SDK.EntityModel;

// This attribute tells applications loading this assembly where to start to initialize the driver
[assembly: DriverAssemblyEntryPoint(typeof(EntryPoint))]

public sealed class EntryPoint : DriverAssemblyEntryPoint
{
    public override DriverController CreateDriverControllerInstance(DriverControllerCreationArgs args)
    {
        // Load up resources from the driver json
        var resources = DriverImplementationResources.FromCreationArgs(args, typeof(EntryPoint));

        // Create driver instance
        var driverEntity = new MyDriverEntity(args, resources);

        // Create the data structure which holds the entity and its configuration controller
        // to pass to DispatchingDeviceController below
        var entity = new ConfigurableDriverEntity(driverEntity.ControllerId, driverEntity, driverEntity.ConfigurationController);

        // This class implements DriverController for us, handling any routing of APIs to any sub-devices
        // or sub-entities we may have.
        return new DispatchingDeviceController(entity, args, null);
    }
}
