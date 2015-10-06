const ComponentTip = require('component-tip')

// only one tip should be visible at a time
// TODO: make it a stack
var activeTip = null

/**
 * Bind a tool tip to be displayed around a target node when the user
 * hovers their mouse over it. It will automatically choose the best
 * position depending on where room is availabe in the viewport
 *
 * @param  {VirtualElement} tip
 * @param  {VirtualElement} target
 * @param  {Object} options
 * @return {target}
 */

const bindTip = (tip, target, options) =>
  target.mergeParams({
    onMouseEnter(e, node, dom) {
      dom.tip.show(dom)
      if (activeTip != dom.tip) hide(activeTip)
      activeTip = dom.tip
    },
    onMouseLeave(e, node, {tip}) {
      tip.el.contains(e.relatedTarget) || hide(tip)
    },
    onMount(dom) {
      dom.tip = new ComponentTip(tip.toDOM(), options)
      if (options.position) dom.tip.position(options.position)
      if (options.effect) dom.tip.effect(options.effect)
      dom.tip.el.onmouseleave = e => {
        dom.contains(e.relatedTarget) || hide(dom.tip)
      }
    },
    onUnMount(dom) {
      hide(dom.tip)
    }
  })

const hide = tip => {
  if (activeTip === tip) activeTip = null
  tip && tip.hide()
}

/**
 * Provides an API for use in JSX
 */

const Tip = (options, [target]) => bindTip(options.content, target, options)

export default Tip
export {bindTip,Tip}
