import { Devvit, MenuItemOnPressEvent, RedditAPIClient } from '@devvit/public-api';

// Ensure Reddit API plugin is enabled
Devvit.configure({
  redditAPI: true,
  // other plugins
});

// Function to fetch and display the first line of the automoderator wiki page
async function getAutomoderatorWikiFirstLine(event: MenuItemOnPressEvent, context: Devvit.Context) {
  const { ui, reddit } = context;

  try {
    // Get the current subreddit name dynamically
    const subreddit = await reddit.getSubredditById(context.subredditId);
    const subredditName = subreddit.name;

    const wikiPage = await reddit.getWikiPage(subredditName, '/config/automoderator');

    if (wikiPage && wikiPage.content) {
      const firstLine = wikiPage.content.split('\n')[0];
      ui.showToast(firstLine); 
    } else {
      ui.showToast('Automoderator wiki page not found or is empty.');
    }
  } catch (error) {
    console.error('Error fetching wiki page:', error);
    ui.showToast('An error occurred while fetching the wiki page.');
  }
}

Devvit.addMenuItem({
  location: 'comment',
  forUserType: 'moderator', 
  label: 'Get Automoderator Wiki First Line',
  onPress: getAutomoderatorWikiFirstLine,
});

export default Devvit;