// server.js (your backend file)

import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';


// NEW IMPORTS FOR FILE UPLOAD AND CSV PARSING
import multer from 'multer';
import csv from 'csv-parser';
import fs from 'fs'; // Node.js built-in file system module

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(bodyParser.json());

// Supabase client using the SERVICE_ROLE_KEY
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// --- READY PLAYER ME CONFIGURATION ---
const READY_PLAYER_ME_API_KEY = process.env.READY_PLAYER_ME_API_KEY;
const RPM_SUBDOMAIN_NAME = 'fantasy-staff'; // Your Ready Player Me subdomain

// --- MULTER CONFIGURATION (EXISTING) ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = './uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});
const upload = multer({ storage: storage });

// --- NEW API ROUTE: UPLOAD CSV FOR PREVIEW AND HEADER EXTRACTION (EXISTING) ---
app.post('/api/upload/csv-preview', upload.single('csvFile'), async (req, res) => {
  // ... (existing CSV upload/preview logic)
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No CSV file uploaded.' });
    }

    const filePath = req.file.path;

    const headers = [];
    const previewData = [];

    await new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('headers', (h) => {
          headers.push(...h);
        })
        .on('data', (data) => {
          if (previewData.length < 5) {
            previewData.push(data);
          }
        })
        .on('end', () => {
          fs.unlink(filePath, (err) => {
            if (err) console.error('Error deleting temp file:', err);
          });
          resolve();
        })
        .on('error', (err) => {
          console.error('CSV Parsing Error:', err);
          fs.unlink(filePath, (unlinkErr) => {
            if (unlinkErr) console.error('Error deleting temp file on error:', unlinkErr);
          });
          reject(new Error('Failed to parse CSV file. Please ensure it is valid.'));
        });
    });

    res.status(200).json({
      message: 'CSV file uploaded and headers extracted successfully.',
      fileName: req.file.originalname,
      headers: headers,
      previewData: previewData,
    });
  } catch (error) {
    console.error('API Route Error during CSV upload/preview:', error.message);
    res
      .status(500)
      .json({ error: error.message || 'Internal server error during CSV processing.' });
  }
});

// --- NEW READY PLAYER ME AVATAR UPDATE ROUTE ---
app.post('/api/update-rpm-avatar', async (req, res) => {
  // This endpoint would be called by your frontend when a user achieves a goal.
  // It should receive the user's ID and possibly an identifier for the achievement/asset.
  const { userId, achievementKey } = req.body; // Example payload from frontend

  if (!userId || !achievementKey) {
    return res.status(400).json({ error: 'User ID and achievement key are required.' });
  }

  if (!READY_PLAYER_ME_API_KEY) {
    console.error('READY_PLAYER_ME_API_KEY environment variable is not set.');
    return res.status(500).json({ error: 'Server configuration error: RPM API key missing.' });
  }

  try {
    // 1. Fetch the user's current 3D avatar URL from your Supabase profile
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('3d_avatar_url')
      .eq('id', userId)
      .single();

    if (profileError || !profileData || !profileData['3d_avatar_url']) {
      console.error('Failed to fetch user profile or 3D avatar URL:', profileError?.message);
      return res.status(404).json({ error: 'User profile or current 3D avatar not found.' });
    }

    const currentAvatarUrl = profileData['3d_avatar_url'];
    // Extract the avatar ID from the URL (e.g., https://models.readyplayer.me/AVATAR_ID.glb)
    const avatarId = currentAvatarUrl.split('/').pop().split('.')[0];

    if (!avatarId) {
      return res.status(400).json({ error: 'Invalid 3D avatar URL found in profile.' });
    }

    // 2. Determine the RPM asset ID based on the achievementKey
    //    This is where your game/app logic comes in. You might have a mapping:
    let assetToApplyId;
    // Example logic:
    if (achievementKey === 'first_quest_complete') {
      assetToApplyId = '65d1d6a782806253457193b2'; // Example RPM Asset ID for a specific hat
    } else if (achievementKey === 'elite_rank_achieved') {
      assetToApplyId = '65d1d6a782806253457193b5'; // Example RPM Asset ID for a special jacket
    }
    // ... add more conditions for other achievements
    else {
      return res.status(400).json({ error: 'Unknown achievement key or no associated RPM asset.' });
    }

    // IMPORTANT: The actual API call structure for updating an avatar depends heavily
    // on the specific Ready Player Me Avatar API endpoint you're using for modifications.
    // You MUST consult the Ready Player Me Avatar API documentation for the exact payload.
    // For example, if you want to apply a specific piece of clothing, you might use
    // a "patch" operation or an "update" with a full list of assets.

    // THIS IS PSEUDO-CODE FOR THE RPM API CALL BODY
    const rpmApiEndpoint = `https://api.readyplayer.me/v2/avatars/${avatarId}`; // v2 is more common now
    const requestBody = {
      // This is a placeholder. You need to verify the exact structure in RPM API docs.
      // Example for applying a new asset to a specific slot (e.g., shirt)
      // You might need to send all current assets if you're replacing, or a patch.
      // For simple "add a new item", RPM might have specific endpoints.
      // Here's a conceptual body for adding/replacing a 'shirt' based on asset type
      outfit: {
        shirt: assetToApplyId, // assuming 'assetToApplyId' is for a shirt
      },
      // Or if it's a "wearable" that just adds on:
      // This requires knowing the asset type and its corresponding slot.
      // You would likely GET the current avatar's data first, then PATCH it.
    };

    console.log(`Attempting to update RPM avatar ${avatarId} with asset ${assetToApplyId}`);

    // 3. Make the API call to Ready Player Me
    const rpmResponse = await fetch(rpmApiEndpoint, {
      method: 'PATCH', // Or PUT, POST depending on RPM API for specific updates
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': READY_PLAYER_ME_API_KEY,
        'User-Agent': `FantasyStaffApp/${RPM_SUBDOMAIN_NAME} (Backend)`,
      },
      body: JSON.stringify(requestBody), // Send the constructed body
    });

    if (!rpmResponse.ok) {
      const errorText = await rpmResponse.text(); // Get raw error for debugging
      console.error('Ready Player Me API Error:', rpmResponse.status, errorText);
      throw new Error(`Ready Player Me API error: ${rpmResponse.status} - ${errorText}`);
    }

    const rpmData = await rpmResponse.json();
    const newRpmAvatarUrl = rpmData.url; // The RPM API should return the new avatar URL

    console.log('RPM Avatar updated successfully. New URL:', newRpmAvatarUrl);

    // 4. Update the user's profile in Supabase with the new avatar URL
    const { error: supabaseUpdateError } = await supabase
      .from('profiles')
      .update({ '3d_avatar_url': newRpmAvatarUrl })
      .eq('id', userId);

    if (supabaseUpdateError) {
      console.error('Supabase error updating 3d_avatar_url:', supabaseUpdateError.message);
      throw new Error('Failed to update 3D avatar URL in your database.');
    }

    console.log(`Supabase profile for user ${userId} updated with new RPM avatar URL.`);
    res.status(200).json({
      message: 'Avatar updated successfully based on achievement!',
      newAvatarUrl: newRpmAvatarUrl,
    });
  } catch (error) {
    console.error('Error in /api/update-rpm-avatar route:', error);
    res.status(500).json({ error: error.message || 'Internal server error during avatar update.' });
  }
});

// --- Your Existing API Routes Below This Line ---

// --- 1. Existing Admin User Creation API Route (EXISTING) ---
app.post('/api/create-profile', async (req, res) => {
  console.log('Received request for /api/create-profile');
  res
    .status(501)
    .json({ message: 'create-profile endpoint not fully implemented in provided snippet.' });
});

// --- 2. New Regular User Sign-Up API Route (EXISTING) ---
app.post('/api/signup-user', async (req, res) => {
  console.log('Received request for /api/signup-user');
  res
    .status(501)
    .json({ message: 'signup-user endpoint not fully implemented in provided snippet.' });
});

// --- UPDATED: Existing Update Profile API Route to handle merit_balance (EXISTING) ---
app.put('/api/update-profile/:id', async (req, res) => {
  const profileId = req.params.id;
  const { newMeritBalance } = req.body;

  if (!profileId) {
    return res.status(400).json({ error: 'Profile ID is required.' });
  }
  if (typeof newMeritBalance === 'undefined' || isNaN(newMeritBalance)) {
    return res.status(400).json({ error: 'newMeritBalance is required and must be a number.' });
  }

  const finalMeritBalance = Math.max(0, parseInt(newMeritBalance, 10));

  console.log(
    `Attempting to update profile ${profileId} with new merit_balance: ${finalMeritBalance}`
  );

  try {
    const { data, error } = await supabase
      .from('profiles')
      .update({ merit_balance: finalMeritBalance })
      .eq('id', profileId)
      .select();

    if (error) {
      console.error(`Supabase error updating profile ${profileId}:`, error);
      return res.status(500).json({
        error: 'Failed to update profile merit balance in Supabase.',
        details: error.message || 'Unknown Supabase error',
      });
    }

    if (!data || data.length === 0) {
      console.warn(`No profile found with ID ${profileId} for update.`);
      return res.status(404).json({ error: `Profile with ID ${profileId} not found.` });
    }

    console.log(
      `Successfully updated merit balance for profile ${profileId}. Updated data:`,
      data[0]
    );
    res.status(200).json({
      message: `Profile ${profileId} merit balance updated successfully.`,
      profile: data[0],
    });
  } catch (err) {
    console.error(`Error in /api/update-profile/:id route for profile ${profileId}:`, err);
    res.status(500).json({
      error: 'Internal server error while updating profile.',
      details: err.message || 'Unknown error',
    });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
