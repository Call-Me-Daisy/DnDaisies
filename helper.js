function test1() {
	return Date();
};
async function test2() {
	return "5";
}

export {
	test1 as t1,
	test2 as t2
};
