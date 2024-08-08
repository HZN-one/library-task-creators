# NPM Package: [@hzn-one/task-creators](https://www.npmjs.com/package/@hzn-one/task-creators)

An npm package to create a task in Google Cloud Tasks Service.

## Exported Class

| Class               | Description                                          |
| ------------------- | ---------------------------------------------------- |
| DeliveryTaskCreator | This class used for create a task in delivery system |

## Exported Method

| Class                                        | Description                                                            |
| -------------------------------------------- | ---------------------------------------------------------------------- |
| DeliveryTaskCreator.insertToDeliveryTracking | Create a task to insert the track data to delivery tracking collection |
| DeliveryTaskCreator.updateIsCancellable      | Create a task to update is cancellable status in order collection      |
| DeliveryTaskCreator.insertLog                | Create a task to insert a log                                          |
| DeliveryTaskCreator.forwardingWebhook        | Create a task to forward the data to client                            |
| DeliveryTaskCreator.insertBilling            | Create a task to insert the data to billing collection                 |
| DeliveryTaskCreator.createNewOrderWhenDriverNotFound            | Create a task to create new order when driver not found                |