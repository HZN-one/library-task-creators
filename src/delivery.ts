const { CloudTasksClient } = require("@google-cloud/tasks");
const client = new CloudTasksClient();

export type HZNDeliveryStatus =
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

interface ICourier {
  /**
   * Courier name
   */
  name: string;
  /**
   * Phone number in string, any format
   */
  phone?: string;
  /**
   * Driver picture URL, example: https://....
   */
  pictureUrl?: string;
  /**
   * Location driver
   */
  coordinates?: { latitude: number; longitude: number };
  vehicle?: {
    /**
     *  license plate number, example: A 3333 SYY
     */
    licensePlate?: string;
  };
}

interface ITrack {
  /**
   * Partner status, each partner mostly have different status
   */
  status: string;
  /**
   * Any message regarding notification
   */
  message?: string;
  /**
   * UTC
   */
  createdAt: number;
  /**
   * Courier detail
   */
  courier?: ICourier;
}

export interface IDeliveryTaskCreator {
  project: string;
}

export interface IRequestPayloadInsertToDeliveryTracking {
  id: string;
  /**
   * HZN Delivery status
   */
  status: HZNDeliveryStatus;
  /**
   * URL of tracking
   */
  trackingUrl?: string;
  /**
   * detail tracking
   */
  track: ITrack;
  /**
   * URL of photo regarding status
   */
  photos?: string[];
}

export interface IRequestPayloadIsCancellable {
  /**
   * Delivery ID is an order ID that coming from partner.
   * Some partner call it like "deliveryId", "reffno", "transaction_id"
   *
   * Some partner use delivery ID as their awb/receipt number
   */
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

export interface IRequestPayloadBilling {
  /**
   * Delivery ID is an order ID that coming from partner.
   * Some partner call it like "deliveryId", "reffno", "transaction_id"
   *
   * Some partner use delivery ID as their awb/receipt number
   */
  deliveryId: string;
  completedAt: number;
}

export interface IRequestChangeDeliveryStatus {
  /**
   * Delivery ID is an order ID that coming from partner.
   * Some partner call it like "deliveryId", "reffno", "transaction_id"
   *
   * Some partner use delivery ID as their awb/receipt number
   */
  deliveryId: string;
  status: HZNDeliveryStatus;
}

export interface IRequestChangeDeliveryData {
  /**
   * Delivery ID is an order ID that coming from partner.
   * Some partner call it like "deliveryId", "reffno", "transaction_id"
   *
   * Some partner use delivery ID as their awb/receipt number
   */
  deliveryId: string;
  newDeliveryId?: string;
  /**
   * Will update finalFee
   */
  newAmount?: number;
  /**
   * Will update delivery status
   */
  newDeliveryStatus?: HZNDeliveryStatus;
  /**
   * URL of delivery proof
   */
  deliveryProofs?: string[];
  /**
   * URL of signature
   */
  signature?: string;
  /**
   * URL of tracking
   */
  trackingUrl?: string;
}

export interface IRequestSimulateWebhook {
  /**
   * Delivery ID is an order ID that coming from partner.
   * Some partner call it like "deliveryId", "reffno", "transaction_id"
   *
   * Some partner use delivery ID as their awb/receipt number
   */
  deliveryId: string;
  serviceUrl: string;
  /**
   * Determine when an order with manual webhook is true will executed
   */
  scheduleExecutedAt: number;
  /**
   * Determine to filter notifications that are not stored yet in system
   */
  lastNotificationAt: number;
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

    try {
      const request =
        this.createRequest<IRequestPayloadInsertToDeliveryTracking>(
          payload,
          location,
          queue,
          url
        );
      const [response] = await client.createTask(request);
      console.log(`Created task ${response.name}`);
      return response.name;
    } catch (error) {
      console.log(`Error insertToDeliveryTracking: `, error);
      return error;
    }
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

    try {
      const request = this.createRequest<IRequestPayloadIsCancellable>(
        payload,
        location,
        queue,
        url
      );

      const [response] = await client.createTask(request);
      console.log(`Created task ${response.name}`);
      return response.name;
    } catch (error) {
      console.log(`Error updateIsCancellable: `, error);
      return error;
    }
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

    try {
      const request = this.createRequest<IRequestPayloadLog>(
        payload,
        location,
        queue,
        url
      );

      const [response] = await client.createTask(request);
      console.log(`Created task ${response.name}`);
      return response.name;
    } catch (error) {
      console.log(`Error insertLog: `, error);
      return error;
    }
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
   *       "status": "COMPLETED",
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

    try {
      const request =
        this.createRequest<IRequestPayloadInsertToDeliveryTracking>(
          payload,
          location,
          queue,
          url
        );

      const [response] = await client.createTask(request);
      console.log(`Created task ${response.name}`);
      return response.name;
    } catch (error) {
      console.log(`Error forwardingWebhook: `, error);
      return error;
    }
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
  public async createBilling(payload: IRequestPayloadBilling): Promise<string> {
    const url = `https://us-central1-${this.project}.cloudfunctions.net/createBilling`;
    const queue = "create-billing";
    const location = "asia-east1";

    try {
      const request = this.createRequest<IRequestPayloadBilling>(
        payload,
        location,
        queue,
        url
      );

      const [response] = await client.createTask(request);
      console.log(`Created task ${response.name}`);
      return response.name;
    } catch (error) {
      console.log(`Error createBilling: `, error);
      return error;
    }
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

    try {
      const request = this.createRequest<IRequestChangeDeliveryStatus>(
        payload,
        location,
        queue,
        url
      );

      const [response] = await client.createTask(request);
      console.log(`Created task ${response.name}`);
      return response.name;
    } catch (error) {
      console.log(`Error changeDeliveryStatus: `, error);
      return error;
    }
  }

  /**
   * A function to update delivery data
   *
   * @param payload     Object reference IRequestChangeDeliveryData (This interface exported)
   * @example
   *
   *    const deliveryTaskCreator = new DeliveryTaskCreator("PROJECT_ID");
   *    deliveryTaskCreator = public async changeDeliveryData({
   *      deliveryId: string,
   *      newDeliveryId?: string
   *      newDeliveryStatus?: string
   *      newAmount?: number
   *    })
   */
  public async changeDeliveryData(
    payload: IRequestChangeDeliveryData
  ): Promise<string> {
    const url = `https://us-central1-${this.project}.cloudfunctions.net/changeDeliveryData`;
    const queue = "change-delivery-data";
    const location = "asia-east1";

    try {
      const request = this.createRequest<IRequestChangeDeliveryData>(
        payload,
        location,
        queue,
        url
      );

      const [response] = await client.createTask(request);
      console.log(`Created task ${response.name}`);
      return response.name;
    } catch (error) {
      console.log(`Error changeDeliveryData: `, error);
      return error;
    }
  }

  /**
   * A function to update delivery data
   *
   * @param payload     Object reference IRequestSimulateWebhook (This interface exported)
   * @example
   *
   *    const deliveryTaskCreator = new DeliveryTaskCreator("PROJECT_ID");
   *    deliveryTaskCreator = public async simulateWebhook({
   *      deliveryId: string,
   *      serviceUrl: string,
   *      updatedAt: number,
   *    });
   */
  public async simulateWebhook(
    payload: IRequestSimulateWebhook
  ): Promise<string> {
    let url: string;
    switch (this.project) {
      case "hzn-production":
        url =
          "https://delivery-partners-queue-run-production-vtbootglhq-uc.a.run.app/v1/webhooks/simulate";
        break;
      case "hzn-sandbox":
        url =
          "https://delivery-partners-queue-run-sandbox-adchrwkija-uc.a.run.app/v1/webhooks/simulate";
        break;
      default:
        url =
          "https://delivery-partners-queue-run-development-ai2gu4pljq-uc.a.run.app/v1/webhooks/simulate";
    }
    const queue = "simulate-webhook";
    const location = "asia-east1";

    try {
      const request = this.createRequest<IRequestSimulateWebhook>(
        payload,
        location,
        queue,
        url
      );

      const [response] = await client.createTask(request);
      console.log(`Created task ${response.name}`);
      return response.name;
    } catch (error) {
      console.log(`Error changeDeliveryData: `, error);
      return error;
    }
  }
}
