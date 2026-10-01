import {D} from '../content.js';
// Transit costs are immutable in normal play. Cache their Decimal classification,
// but also invalidate on replacement so imports and development fixtures stay safe.
const costs=new WeakMap();
export function isPaid(q){let c=costs.get(q);if(!c||c.cost!==q.cost){c={cost:q.cost,paid:D(q.cost).gt(0)};costs.set(q,c);}return c.paid;}
export function paidCount(queue){let count=0;for(const q of queue)if(isPaid(q))count++;return count;}
