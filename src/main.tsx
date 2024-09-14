import { Devvit, MenuItemOnPressEvent, SettingScope, WikiPage, RedditAPIClient } from '@devvit/public-api';

// Enable Redis plugin (if needed for other features)
Devvit.configure({
  redis: true,
  redditAPI: true,
});

Devvit.addSettings([
  {
    type: 'string',
    name: 'subreddit_name',
    label: 'Subreddit Name',
  },
]);

// Get username from event 
async function getUsername(event: MenuItemOnPressEvent, context: Devvit.Context) {
  const { location, targetId } = event;
  const { reddit } = context;
  let thing;

  if (location === 'post') {
    thing = await reddit.getPostById(targetId);
  } else if (location === 'comment') {
    thing = await reddit.getCommentById(targetId);
  } else {
    throw 'Cannot find a post or comment with that ID';
  }

  // Check if authorId exists before proceeding
  if (!thing.authorId) {
    throw 'The post or comment does not have an authorId'; // Or handle it differently
  }

  const author = await reddit.getUserById(thing.authorId);

  // Optional: Handle the case where author itself is undefined
  if (!author) {
    throw 'Could not find the author'; // Or handle it differently
  }

  // Provide a default value or handle the case where username is undefined
  return author.username || '[]';
}

async function updateAutomodConfig(usernameToAdd: string, context: Devvit.Context) {
  const { ui, reddit, settings } = context;

  try {
    const subreddit = await reddit.getSubredditById(context.subredditId);
    const subredditName = subreddit.name as string;

    // Fetch the current wiki page
    const wikiPage = await reddit.getWikiPage(subredditName, 'config/automoderator');
    const currentContent = wikiPage.content;

    const beginMarker = '# BEGIN MANAGED BLOCK BY FILTER-USER APP';
    const endMarker = '# END MANAGED BLOCK BY FILTER-USER APP';

    const startIndex = currentContent.indexOf(beginMarker);
    const endIndex = currentContent.indexOf(endMarker);

    let newContent;
    if (startIndex !== -1 && endIndex !== -1) {
      // Block exists, update the author list within it
      const existingBlock = currentContent.substring(startIndex, endIndex + endMarker.length);
      const authorListMatch = existingBlock.match(/author:\s*\n\s*((-\s*\w+\s*\n\s*)+)/);
    
      if (authorListMatch) {
        let authorList = authorListMatch[1].trim();
        // Trim whitespace from each line in the author list
        authorList = authorList.split('\n').map(line => line.trim()).join('\n');
    
        // Check if the username already exists in the list
        if (authorList.includes(`- ${usernameToAdd}`)) {
          ui.showToast(`User ${usernameToAdd} is already in the filter list.`);
          return;
        }
    
        // Maintain indentation when adding a new user, handle empty list case
        const indentationMatch = authorList.match(/^\s*-\s*/);
        const indentation = indentationMatch ? indentationMatch[0].replace(/-\s*/, '') : '    '; // Use 4 spaces if the list is empty
        const newAuthorList = authorList ? `${authorList}\n${indentation}- ${usernameToAdd}` : `${indentation}- ${usernameToAdd}`;
        newContent = currentContent.replace(authorListMatch[0], `author:\n${newAuthorList}\n`);
    
        // Log the new content for debugging
        console.log(newContent);
      } else {
        // Handle unexpected block format
        ui.showToast('Error: AutoMod config block has an unexpected format.');
        return;
      }
    } else {
      // Block doesn't exist, create it
      newContent =
        currentContent +
        `\n${beginMarker}\n---\nauthor:\n    - ${usernameToAdd}\naction: filter\naction_reason: Watchlisted user - [{{match}}]\n${endMarker}\n---\n`;
    }

    // Update the wiki page
    await reddit.updateWikiPage({
      content: newContent,
      page: 'config/automoderator',
      reason: 'Added user to filter list',
      subredditName
    });

    ui.showToast(`Added user ${usernameToAdd} to the AutoMod filter list.`);

  } catch (error) {
    console.error('Error updating AutoMod config:', error);
    ui.showToast('An error occurred while updating the AutoMod config. Please try again.');
  }
}

// Function to check the last action time for a user
async function checkLastActionTime(username: string, context: Devvit.Context) {
  const { ui, redis } = context;

  try {
    const timestampStr = await redis.get(`user_last_action_time:${username}`);
    if (timestampStr) {
      const timestamp = parseInt(timestampStr);
      const date = new Date(timestamp);
      const formattedDate = date.toISOString().slice(0, 19).replace('T', ' ');
      ui.showToast(`Last action for ${username} was on ${formattedDate} (UTC)`);
    } else {
      ui.showToast(`No action history found for ${username}`);
    }
  } catch (error) {
    console.error('Error checking last action time:', error);
    ui.showToast('An error occurred while checking the last action time. Please try again.');
  }
}

// Function to remove a user from the AutoModerator config
async function removeUserFromFilter(usernameToRemove: string, context: Devvit.Context) {
  const { ui, reddit, settings } = context;

  try {
    const subreddit = await reddit.getSubredditById(context.subredditId);
    const subredditName = subreddit.name as string;

    const wikiPage = await reddit.getWikiPage(subredditName, 'config/automoderator');
    const currentContent = wikiPage.content;

    const beginMarker = '# BEGIN MANAGED BLOCK BY FILTER-USER APP';
    const endMarker = '# END MANAGED BLOCK BY FILTER-USER APP';

    const startIndex = currentContent.indexOf(beginMarker);
    const endIndex = currentContent.indexOf(endMarker);

    if (startIndex !== -1 && endIndex !== -1) {
      const existingBlock = currentContent.substring(startIndex, endIndex + endMarker.length);
      const authorRegex = new RegExp(`- ${usernameToRemove}\\s*\\n?`, 'g');
      if (authorRegex.test(existingBlock)) {
        const newContent = currentContent.replace(authorRegex, '').replace(/\n\s*\n/g, '\n');
        await reddit.updateWikiPage({
          content: newContent,
          page: 'config/automoderator',
          reason: 'Removed user from filter list',
          subredditName
        });
        ui.showToast(`Removed user ${usernameToRemove} from the AutoMod filter list.`);
      } else {
        ui.showToast(`User ${usernameToRemove} not found in the filter list.`);
      }
    } else {
      ui.showToast('AutoMod config block not found.');
    }
  } catch (error) {
    console.error('Error removing user from filter:', error);
    ui.showToast('An error occurred while removing the user from the filter. Please try again.');
  }
}

// Add menu item to add a user to the filter list
Devvit.addMenuItem({
  location: 'comment',
  forUserType: 'moderator',
  label: 'Add User to Filter',
  onPress: async (event, context) => {
    const usernameToAdd = await getUsername(event, context);
    await updateAutomodConfig(usernameToAdd, context);
  },
});

// Add menu item to check the last action time
Devvit.addMenuItem({
  location: 'comment',
  forUserType: 'moderator',
  label: 'Check Last Action Time',
  onPress: async (event, context) => {
    const username = await getUsername(event, context);
    await checkLastActionTime(username, context);
  },
});

// Add menu item to remove a user from the filter
Devvit.addMenuItem({
  location: 'comment',
  forUserType: 'moderator',
  label: 'Remove User from Filter',
  onPress: async (event, context) => {
    const usernameToRemove = await getUsername(event, context);
    await removeUserFromFilter(usernameToRemove, context);
  },
});

export default Devvit;