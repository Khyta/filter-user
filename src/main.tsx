import { Devvit, MenuItemOnPressEvent } from '@devvit/public-api';

// Enable Redis plugin
Devvit.configure({
  redis: true,
  redditAPI: true,
});

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

  if (!thing.authorId) {
    throw 'The post or comment does not have an authorId';
  }

  const author = await reddit.getUserById(thing.authorId);

  if (!author) {
    throw 'Could not find the author';
  }

  return author.username || '[]';
}

async function removeUserFromFilter(usernameToRemove: string, context: Devvit.Context, event: MenuItemOnPressEvent) {
  const { ui, redis, reddit } = context;

  try {
    const subreddit = await reddit.getSubredditById(context.subredditId);
    const subredditName = subreddit.name as string;

    const filteredUsers = await redis.get('filtered_users');
    const userList = filteredUsers ? JSON.parse(filteredUsers) : [];

    if (!userList.includes(usernameToRemove)) {
      ui.showToast(`User ${usernameToRemove} not found in the filter list.`);
      return;
    }

    const updatedUserList = userList.filter(user => user !== usernameToRemove);
    await redis.set('filtered_users', JSON.stringify(updatedUserList));

    const timestamp = Date.now();
    await redis.set(`user_last_action_time:${usernameToRemove}`, timestamp.toString());
    await redis.set(`user_last_action:${usernameToRemove}`, 'removed from filter');

    ui.showToast(`Removed user ${usernameToRemove} from the filter list.`);

    // Add a mod note about the removal
    await reddit.addModNote({
      subreddit: subredditName,
      user: usernameToRemove,
      redditId: event.targetId,
      note: `Removed from filter list`
    })
  } catch (error) {
    console.error('Error removing user from filter:', error);
    ui.showToast('An error occurred while removing the user from the filter. Please try again.');
  }
}

async function addToFilterList(usernameToAdd: string, context: Devvit.Context, event: MenuItemOnPressEvent) {
  const { ui, redis, reddit } = context;

  try {
    const subreddit = await reddit.getSubredditById(context.subredditId);
    const subredditName = subreddit.name as string;

    const filteredUsers = await redis.get('filtered_users');
    const userList = filteredUsers ? JSON.parse(filteredUsers) : [];

    if (userList.includes(usernameToAdd)) {
      ui.showToast(`User ${usernameToAdd} is already in the filter list.`);
      return;
    }

    userList.push(usernameToAdd);
    await redis.set('filtered_users', JSON.stringify(userList));

    const timestamp = Date.now();
    await redis.set(`user_last_action_time:${usernameToAdd}`, timestamp.toString());
    await redis.set(`user_last_action:${usernameToAdd}`, 'added to filter');

    ui.showToast(`Added user ${usernameToAdd} to the filter list.`);

    // Add a mod note about the addition
    await reddit.addModNote({
      subreddit: subredditName,
      user: usernameToAdd,
      redditId: event.targetId,
      note: `Added to filter list`
    })
  } catch (error) {
    console.error('Error updating filter list:', error);
    ui.showToast('An error occurred while updating the filter list. Please try again.');
  }
}

async function checkLastActionTime(username: string, context: Devvit.Context) {
  const { ui, redis } = context;

  try {
    const timestampStr = await redis.get(`user_last_action_time:${username}`);
    const lastAction = await redis.get(`user_last_action:${username}`);

    if (timestampStr) {
      const timestamp = parseInt(timestampStr);
      const date = new Date(timestamp);
      const formattedDate = date.toISOString().slice(0, 19).replace('T', ' ');
      ui.showToast(`Last action for ${username} was ${lastAction} on ${formattedDate} (UTC)`);
    } else {
      ui.showToast(`No action history found for ${username}`);
    }
  } catch (error) {
    console.error('Error checking last action time:', error);
    ui.showToast('An error occurred while checking the last action time. Please try again.');
  }
}

// Add menu item to add a user to the filter list
Devvit.addMenuItem({
  location: 'comment',
  forUserType: 'moderator',
  label: 'Add to Filter',
  description: 'Adds the user to the filter list',
  onPress: async (event, context) => {
    const usernameToAdd = await getUsername(event, context);
    await addToFilterList(usernameToAdd, context, event);
  },
});

// Add menu item to check the last action time
Devvit.addMenuItem({
  location: 'comment',
  forUserType: 'moderator',
  label: 'Check last Filter Time',
  description: 'Checks when the last filter action was performed on the user',
  onPress: async (event, context) => {
    const username = await getUsername(event, context);
    await checkLastActionTime(username, context);
  },
});

// Add menu item to remove a user from the filter
Devvit.addMenuItem({
  location: 'comment',
  forUserType: 'moderator',
  label: 'Remove from Filter',
  description: 'Removes the user from the filter list',
  onPress: async (event, context) => {
    const usernameToRemove = await getUsername(event, context);
    await removeUserFromFilter(usernameToRemove, context, event);
  },
});

export default Devvit;