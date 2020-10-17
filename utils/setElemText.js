const setElemText = (elem, value) => {
  while (elem.firstChild) elem.removeChild(elem.firstChild);
  elem.appendChild(document.createTextNode(value));
}
export default setElemText