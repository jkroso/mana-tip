const ComponentTip = require('component-tip')

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
    onMouseEnter(e, {dom}) {
      dom.tip.show(dom)
    },
    onMouseLeave(e, {dom:{tip}}) {
      tip.el.contains(e.relatedTarget) || tip.hide()
    },
    onMount({dom}) {
      dom.tip = new ComponentTip(tip.toDOM(), options)
      if (options.position) dom.tip.position(options.position)
      if (options.effect) dom.tip.effect(options.effect)
      dom.tip.el.onmouseleave = e => {
        dom.contains(e.relatedTarget) || dom.tip.hide()
      }
    },
    onUnMount({dom}) {
      dom.tip.hide()
    }
  })

/**
 * Provides an API for use in JSX
 */

const Tip = (options, [target]) => bindTip(options.content, target, options)

export default Tip
export {bindTip,Tip}
