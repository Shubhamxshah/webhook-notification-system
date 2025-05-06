import express from "express";
import rateLimit from "express-rate-limit";
import { v4 as uuidv4 } from "uuid";

export const app = express();
const PORT = process.env.PORT || 3001;
app.use(express.json());

const webhooks = new Map();
const deliveryLogs = new Map();

const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 5
})

// Webhook registration 
app.post("/api/webhooks", limiter,  (req, res) => {
  const {url, events, secret} = req.body;

  if (!url || !events || !Array.isArray(events) || !secret || events.length === 0){
    res.status(400).json({error: 'Invalid Inputs'})
    return;
  }

  const id = uuidv4();
  webhooks.set(id, {url, events, secret});
  res.status(201).json({ id, url, events });
})

//List registered webhooks
app.get("/api/webhooks", (_, res) => {
  const webhookList = Array.from(webhooks.entries()).map(([id, data]) => ({
    id, 
    url: data.url, 
    events: data.events 
  }));
  res.json(webhookList);
});

//update a webhook 
app.put("/api/webhooks/:id", (req, res) => {
  const { id } = req.params;
  const { url, events, secret } = req.body;

  if (!webhooks.has(id)) {
    res.status(404).json({error: 'Webhook not found'});
    return;
  }

  if (!url || !events || !Array.isArray(events) || events.length === 0) {
    res.status(400).json({ error: 'Invalid Inputs'});
    return;
  }

  webhooks.set(id, {url, events, secret});
  res.status(201).json({id, url, secret});
})

app.delete("/api/webhooks/:id", (req, res) => {
  const {id} = req.params;

  if (!webhooks.has(id)) {
    res.status(404).json({error: 'Webhook not found'});
    return;
  }

  webhooks.delete(id);
  res.status(204).send();
});

app.post('/api/events', async (req, res) => {
  const {eventType, payload } = req.body;

  if (!eventType || !payload) {
    res.status(400).json({error: 'Invalid Inputs'});
    return;
  }

  const relevantWebhooks = Array.from(webhooks.entries()).filter(([, data]) => data.events.includes(eventType));

  for (const [id, data] of relevantWebhooks){
    sendWebhookWithRetry(id, data, eventType, payload);
  }

  res.status(202).json({message: 'Event processing started'});
})

function signPayload(payload, secret) {
  return crypto.createHmac('sha256', secret).update(JSON.stringify(payload)).digest('hex');
}

async function sendWebhookWithRetry(id, webhookData, eventType, payload, attempt = 1) {
  const {url, secret} = webhookData;
  const maxRetries = 3;
  const baseDelay = 1000; // 1 second

  try {
    const headers = {
      'Content-type': 'application/json', 
      'X-Event-Type': eventType
    };

    if (secret) {
      const signature = signPayload(payload, secret);
      headers['X-hub-Signature'] = `sha256=${signature}`;
    }

    const response = await axios.post(url, payload, {headers});

    logDelivery(id, {
      timestamp: new Date(), 
      eventType,
      status: 'success', 
      statusCode: response.status
    });
  } catch (error) {
    logDelivery(id, {
      timestamp: new Date(), 
      eventType, 
      status: 'failed', 
      statusCode: error.response ? error.response.status : 'N/A', 
      error: error.message
    })
  }
}



app.listen(PORT, () => {
  console.log( `server listening on port ${PORT}`)
})
