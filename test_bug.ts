let next = false;
function setGms(updater: any) {
  setTimeout(() => updater(), 10);
}
setGms(() => { next = true; });
console.log(next); // Should be false!
