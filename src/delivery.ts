const { CloudTasksClient } = require("@google-cloud/tasks");
const client = new CloudTasksClient();

interface ICourier {
  name: string;
  phone?: string;
  pictureUrl?: string;
  coordinates?: { latitude: number; longitude: number };
  vihacle?: {
    licensePlate?: string;
    model?: string;
    physicalVehicleType?: string;
  };
}

interface ITrack {
  code?: string;
  status: string;
  message: string;
  createdAt: string;
  courier?: ICourier;
}

interface IRequestPayload {
  id: string;
  status: string;
  trackingUrl?: string;
  track: ITrack;
}

export interface IDeliveryTaskCreator {
  project: string;
}

export class DeliveryTaskCreator {
  project: string;
  serviceAccountEmail: string;

  constructor(project: string) {
    this.project = project;
    this.serviceAccountEmail = `${project}@appspot.gserviceaccount.com`;
  }

  /**
   * A function to create a task that creating new track data in delivery tracking collection
   *
   * @param payload     Object reference IRequestPayload (This interface exported)
   * @example
   *
   *    const deliveryTaskCreator = new DeliveryTaskCreator("test");
   *    deliveryTaskCreator.insertToDeliveryTracking({
   *       "id": "1111",
   *       "status": "FINISHED",
   *       "trackingUrl": "",
   *       "track": {
   *           "status": "FINISHED",
   *           "message": "Your packet arrived",
   *             "createdAt": "1231231231231",
   *             "courier": {
   *               "name": "Didik M",
   *               "phone": "0890890980"
   *             }
   *       }
   *     })
   */
  public async insertToDeliveryTracking(
    payload: IRequestPayload
  ): Promise<string> {
    const url = `https://us-central1-${this.project}.cloudfunctions.net/insertToDeliveryTrackingCollection`;
    const queue = "insert-to-delivery-tracking-collection";
    const location = "asia-east1";

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

    const request = { parent: parent, task: task };
    const [response] = await client.createTask(request);
    console.log(`Created task ${response.name}`);
    return response.name;
  }
}
