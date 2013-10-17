module.exports = {
	allowUserIDs: function(user, idArr) {
		for(var id in idArr) {
			if(user.id == idArr[id]) return true;
		}
		return false;
	},
	percentageOfUsers: function(user, percent) {
		return (user.id % 100 < percent * 100);
	},
	isPaidUser: function(user, isPaid) {
		return user.isPaid == isPaid;
	}
};