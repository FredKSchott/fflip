module.exports = {
	allowUserIDs: function(user, data) {
		for(var id in data.idArray) {
			if(user.id == id) return true;
		}
		return false;
	},
	percentageOfUsers: function(user, data) {
		return (user.id % 100 < data.percent * 100);
	},
	isFreeUser: function(user, data) {
		return !user.paid;
	}
}