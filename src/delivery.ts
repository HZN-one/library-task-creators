const { CloudTasksClient } = require("@google-cloud/tasks");
const client = new CloudTasksClient();

interface ICourier {
  name: string;
  phone?: string;
  pictureUrl?: string;
  coordinates?: { latitude: number; longitude: number };
  vehicle?: {
    licensePlate?: string;
    model?: string;
    physicalVehicleType?: string;
  };
}

interface ITrack {
  status: string;
  message?: string;
  createdAt: number;
  courier?: ICourier;
}

export interface IDeliveryTaskCreator {
  project: string;
}

export interface IRequestPayloadInsertToDeliveryTracking {
  id: string;
  status: string;
  trackingUrl?: string;
  track: ITrack;
}

export interface IRequestPayloadIsCancellable {
  deliveryId: string;
}
export interface IRequestPayloadLog {
  clientId: string;
  category: "ACTIVITY" | "API CALL" | "AUTHENTICATION" | "WEBHOOK";
  type: "INFO" | "ERROR";
  target: "HZN" | "CLIENT";
  hznProduct: {
    id: string;
    name: string;
  };
  log: any;
  agent: {
    app_name: string;
    [key: string]: string;
  };
}

export interface IRequestPayloadBilling {}

export interface IRequestChangeDeliveryStatus {
  deliveryId: string;
  status:
    | ""
    | "NEW ORDER"
    | "ALLOCATING"
    | "REJECTED"
    | "DRIVER ASSIGNED"
    | "PICKING UP"
    | "DRIVER NOT FOUND"
    | "ITEM PICKED"
    | "ON DELIVERY"
    | "RECEIVED"
    | "COMPLETED"
    | "REACTIVATED"
    | "ON HOLD"
    | "CANCELLED"
    | "DELAYED"
    | "EXPIRED"
    | "RETURNED"
    | "FAILED";
}

export interface IRequestChangeDeliveryData {
  deliveryId: string;
  newDeliveryId?: string;
  newAmount?: string;
  newDeliveryStatus?: string;
}

export class DeliveryTaskCreator {
  private project: string;
  private serviceAccountEmail: string;

  constructor(project: string) {
    this.project = project;
    this.serviceAccountEmail = `${project}@appspot.gserviceaccount.com`;
  }

  private createRequest<T>(
    payload: T,
    location: string,
    queue: string,
    url: string
  ) {
    const parent = client.queuePath(this.project, location, queue);
    const serviceAccountEmail = this.serviceAccountEmail;
    const task = {
      httpRequest: {
        httpMethod: "POST",
        url,
        body: Buffer.from(JSON.stringify(payload)).toString("base64"),
        headers: {
          "Content-Type": "application/json",
        },
        oidcToken: {
          serviceAccountEmail,
        },
      },
    };

    return { parent: parent, task: task };
  }

  /**
   * A function to create a task that creating new track data in delivery tracking collection
   *
   * @param payload     Object reference IRequestPayloadInsertToDeliveryTracking (This interface exported)
   * @example
   *
   *    const deliveryTaskCreator = new DeliveryTaskCreator("PROJECT_ID");
   *    deliveryTaskCreator.insertToDeliveryTracking({
   *       "id": "1111",
   *       "status": "FINISHED",
   *       "trackingUrl": "",
   *       "track": {
   *           "status": "FINISHED",
   *           "message": "Your packet arrived",
   *             "createdAt": 1231231231231,
   *             "courier": {
   *               "name": "Didik M",
   *               "phone": "0890890980"
   *             }
   *       }
   *     })
   */
  public async insertToDeliveryTracking(
    payload: IRequestPayloadInsertToDeliveryTracking
  ): Promise<string> {
    const url = `https://us-central1-${this.project}.cloudfunctions.net/insertToDeliveryTrackingCollection`;
    const queue = "insert-to-delivery-tracking-collection-tmp";
    const location = "asia-east1";

    const request = this.createRequest<IRequestPayloadInsertToDeliveryTracking>(
      payload,
      location,
      queue,
      url
    );
    const [response] = await client.createTask(request);
    console.log(`Created task ${response.name}`);
    return response.name;
  }

  /**
   * A function to update is cancellable status in order collection
   *
   * @param payload     Object reference IRequestPayloadIsCancellable (This interface exported)
   * @example
   *
   *    const deliveryTaskCreator = new DeliveryTaskCreator("PROJECT_ID");
   *    deliveryTaskCreator.updateIsCancellable("DELIVERY_ID")
   */
  public async updateIsCancellable(
    payload: IRequestPayloadIsCancellable
  ): Promise<string> {
    const url = `https://us-central1-${this.project}.cloudfunctions.net/isDeliveryCancellable`;
    const queue = "update-is-cancellable";
    const location = "asia-east1";

    const request = this.createRequest<IRequestPayloadIsCancellable>(
      payload,
      location,
      queue,
      url
    );

    const [response] = await client.createTask(request);
    console.log(`Created task ${response.name}`);
    return response.name;
  }

  /**
   * A function to create a log
   *
   * @param payload     Object reference IRequestPayloadLog (This interface exported)
   * @example
   *
   *    const deliveryTaskCreator = new DeliveryTaskCreator("PROJECT_ID");
   *    deliveryTaskCreator.insertLog({
   *      clientId: "123123",
   *      category: "API CALL",
   *      type: "INFO",
   *      target: "HZN",
   *      hznProduct: {
   *        id: "1",
   *        name: "FLICK",
   *      }
   *      log: {
   *          // Your log
   *      },
   *    })
   */
  public async insertLog(payload: IRequestPayloadLog): Promise<string> {
    const url = `https://us-central1-${this.project}.cloudfunctions.net/insertLog`;
    const queue = "insert-log";
    const location = "asia-east1";

    const request = this.createRequest<IRequestPayloadLog>(
      payload,
      location,
      queue,
      url
    );

    const [response] = await client.createTask(request);
    console.log(`Created task ${response.name}`);
    return response.name;
  }

  /**
   * A function to forward notification from delivery partner
   *
   * @param payload     Object reference IRequestPayloadInsertToDeliveryTracking (This interface exported)
   * @example
   *
   *    const deliveryTaskCreator = new DeliveryTaskCreator("PROJECT_ID");
   *    deliveryTaskCreator.forwardingWebhook({
   *       "id": "1111",
   *       "status": "FINISHED",
   *       "trackingUrl": "",
   *       "track": {
   *           "status": "FINISHED",
   *           "message": "Your packet arrived",
   *             "createdAt": 1231231231231,
   *             "courier": {
   *               "name": "Didik M",
   *               "phone": "0890890980"
   *             }
   *       }
   *    })
   */
  public async forwardingWebhook(
    payload: IRequestPayloadInsertToDeliveryTracking
  ): Promise<string> {
    const url = `https://us-central1-${this.project}.cloudfunctions.net/forwardingWebhook`;
    const queue = "forwarding-webhook";
    const location = "asia-east1";

    const request = this.createRequest<IRequestPayloadInsertToDeliveryTracking>(
      payload,
      location,
      queue,
      url
    );

    const [response] = await client.createTask(request);
    console.log(`Created task ${response.name}`);
    return response.name;
  }

  /**
   * A function to insert a billing (Next release!)
   *
   * @param payload     Object reference IRequestPayloadBilling (This interface exported)
   * @example
   *
   *    const deliveryTaskCreator = new DeliveryTaskCreator("PROJECT_ID");
   *    deliveryTaskCreator.insertBilling({
   *
   *    })
   */
  public async insertBilling(payload: IRequestPayloadBilling): Promise<string> {
    const url = `https://us-central1-${this.project}.cloudfunctions.net/insertBilling`;
    const queue = "insert-billing";
    const location = "asia-east1";

    const request = this.createRequest<IRequestPayloadBilling>(
      payload,
      location,
      queue,
      url
    );

    const [response] = await client.createTask(request);
    console.log(`Created task ${response.name}`);
    return response.name;
  }

  /**
   * A function to update delivery status
   *
   * @param payload     Object reference IRequestChangeDeliveryStatus (This interface exported)
   * @example
   *
   *    const deliveryTaskCreator = new DeliveryTaskCreator("PROJECT_ID");
   *    deliveryTaskCreator.changeDeliveryStatus({
   *      deliveryId: string,
   *      status: string
   *    })
   */
  public async changeDeliveryStatus(
    payload: IRequestChangeDeliveryStatus
  ): Promise<string> {
    const url = `https://us-central1-${this.project}.cloudfunctions.net/changeDeliveryStatus`;
    const queue = "change-delivery-status";
    const location = "asia-east1";

    const request = this.createRequest<IRequestChangeDeliveryStatus>(
      payload,
      location,
      queue,
      url
    );

    const [response] = await client.createTask(request);
    console.log(`Created task ${response.name}`);
    return response.name;
  }

  /**
   * A function to update delivery status
   *
   * @param payload     Object reference IRequestChangeDeliveryData (This interface exported)
   * @example
   *
   *    const deliveryTaskCreator = new DeliveryTaskCreator("PROJECT_ID");
   *    deliveryTaskCreator = public async changeDeliveryData({
   *      deliveryId: string,
   *      newDeliveryId?: string
   *      newDeliveryStatus?: string
   *      newAmount?: string
   *    })
   */
  public async changeDeliveryData(
    payload: IRequestChangeDeliveryData
  ): Promise<string> {
    const url = `https://us-central1-${this.project}.cloudfunctions.net/changeDeliveryData`;
    const queue = "change-delivery-data";
    const location = "asia-east1";

    const request = this.createRequest<IRequestChangeDeliveryData>(
      payload,
      location,
      queue,
      url
    );

    const [response] = await client.createTask(request);
    console.log(`Created task ${response.name}`);
    return response.name;
  }
}
