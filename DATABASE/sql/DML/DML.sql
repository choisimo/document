-- DML : SELECT, INSERT, UPDATE, DELETE
create table hello(
    id bigint AUTO_INCREMENT PRIMARY key,
    username varchar(50)
);


SELECT * FROM hello;

insert into hello VALUES
(1, "mynameis");

DROP TABLE hello;
SELECT USER, HOST FROM mysql.USER;


## JOIN TEST ##
create table member 
(
    id bigint AUTO_INCREMENT PRIMARY key,
    member_no varchar(10),
    name varchar(10)
);

insert into member values
(101, "B117", "이창훈"),
(102, "K230", "이흥직"),
(103, "K300", "정광호");

create table company
(
    id varchar(50) PRIMARY key,
    name VARCHAR(10),
    address VARCHAR(50)
);

insert into company values
("K230", "이흥직", "원주"),
("K300", "정광호", "서울"),
("K400", "김보연", "전주");

# RIGHT OUTER JOIN => All of right values are contained 
SELECT member.*, company.* from member RIGHT OUTER JOIN company ON member.member_no = company.id;
SELECT member.*, company.* from member LEFT OUTER JOIN company ON member.member_no = company.id;
SELECT member.*, company.* from member INNER JOIN company ON member.member_no = company.id;
SELECT member.*, company.* from company RIGHT OUTER JOIN member ON member.member_no = company.id;

