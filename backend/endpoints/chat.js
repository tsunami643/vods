const pool = require('../db/connection');
const { convertChatData, validateChatData } = require('../services/chat_converter');

// TODO: rework this method and update docs

/**
 * @swagger
 * /chat:
 *   post:
 *     summary: Protected method to add chat log
 *     tags: [Chat]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             oneOf:
 *               - type: object
 *                 properties:
 *                   message:
 *                     type: string
 *                   user_data:
 *                     type: object
 *                   secret_key:
 *                     type: string
 *                 required:
 *                   - message
 *                   - secret_key
 *               - type: object
 *                 properties:
 *                   chat_id:
 *                     type: number
 *                   chat_log:
 *                     type: object
 *                   secret_key:
 *                     type: string
 *                 required:
 *                   - chat_id
 *                   - chat_log
 *                   - secret_key
 *     responses:
 *       200:
 *         description: Message logged successfully
 *       401:
 *         description: Unauthorized - Invalid secret key
 *       400:
 *         description: Bad request - Missing required fields
 */
module.exports = (app) => {
  app.post('/chat', async (req, res) => {
    try {
      const { message, user_data, chat_id, chat_log, secret_key } = req.body;
      
      if (!secret_key) {
        return res.status(400).json({ error: 'secret_key is required' });
      }
      
      // FIXME: this can be done better
      const secretQuery = 'SELECT * FROM api_secrets WHERE name = $1 AND secret_key = $2 AND is_active = true';
      const secretResult = await pool.query(secretQuery, ['chat_api', secret_key]);
      
      if (secretResult.rows.length === 0) {
        return res.status(401).json({ error: 'Invalid secret key' });
      }
      
      let finalMessage, finalUserData;
      
      if (chat_id !== undefined && chat_log !== undefined) {
        if (!validateChatData(chat_log)) {
          return res.status(400).json({ error: 'Invalid chat_log format' });
        }
        
        const convertedChatLog = convertChatData(chat_log);
        
        finalMessage = `Chat log ${chat_id}`;
        finalUserData = {
          chat_id: chat_id,
          chat_log: convertedChatLog,
          imported_at: new Date().toISOString()
        };
      }

      else if (message !== undefined) {
        finalMessage = message;
        finalUserData = user_data || {};
      }

      else {
        return res.status(400).json({ 
          error: 'Either (message) or (chat_id and chat_log) are required' 
        });
      }
      
      const insertQuery = 'INSERT INTO chat_logs (message, user_data) VALUES ($1, $2) RETURNING id';
      const result = await pool.query(insertQuery, [finalMessage, JSON.stringify(finalUserData)]);
      
      res.json({ 
        success: true, 
        message: chat_id !== undefined 
          ? `Chat log ${chat_id} added successfully`
          : 'Chat message logged successfully',
        id: result.rows[0].id,
        ...(chat_id !== undefined && { chat_id })
      });
      
    } catch (error) {
      console.error('Error in /chat:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
}; 