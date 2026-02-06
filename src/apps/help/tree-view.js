class TreeView {
  constructor(container, data) {
    this.container = container;
    this.data = data;
    this.selectedNode = null;
  }

  render() {
    const ul = document.createElement('ul');
    ul.className = 'tree-view';
    this.data.topics.forEach(topic => {
      const li = this._createNode(topic);
      ul.appendChild(li);
    });
    this.container.innerHTML = '';
    this.container.appendChild(ul);
  }

  _createNode(topic) {
    const li = document.createElement('li');
    li.classList.add('tree-node');

    const label = document.createElement('div');
    label.className = 'node-label';

    const icon = document.createElement('span');
    icon.className = 'icon';

    label.appendChild(icon);
    label.appendChild(document.createTextNode(topic.title));
    li.appendChild(label);

    if (topic.children && topic.children.length > 0) {
      li.classList.add('branch');
      icon.classList.add('icon-book-closed');

      const childrenUl = document.createElement('ul');
      childrenUl.style.display = 'none'; // Initially collapsed
      topic.children.forEach(child => {
        childrenUl.appendChild(this._createNode(child));
      });
      li.appendChild(childrenUl);

      label.addEventListener('click', () => {
        // Toggle expansion
        const isCurrentlyExpanded = childrenUl.style.display === 'block';
        const isNowExpanded = !isCurrentlyExpanded;
        childrenUl.style.display = isNowExpanded ? 'block' : 'none';
        icon.classList.toggle('icon-book-closed', !isNowExpanded);
        icon.classList.toggle('icon-book-open', isNowExpanded);

        // Also select the topic to show its content
        if (this.selectedNode) {
          this.selectedNode.classList.remove('selected');
        }
        label.classList.add('selected');
        this.selectedNode = label;
        this.container.dispatchEvent(new CustomEvent('topic-selected', { detail: topic }));
      });
    } else {
      li.classList.add('leaf');
      icon.classList.add('icon-page');
      label.addEventListener('click', () => {
        if (this.selectedNode) {
          this.selectedNode.classList.remove('selected');
        }
        label.classList.add('selected');
        this.selectedNode = label;
        this.container.dispatchEvent(new CustomEvent('topic-selected', { detail: topic }));
      });
    }

    return li;
  }
}

export default TreeView;
