/**
 * 주어진 n개의 눈송이 컬렉션 중에서 똑같은 눈송이 쌍이 존재하는지 여부 판별 (6개 숫자)
 * 조건 :
 *  1. 순차적 일치  2. 오른쪽 이동 일치  3. 왼쪽 이동 일치
 *
 * 왜 해시테이블을 이용하는가?
 * 순차적이므로 똑같은 눈송이 쌍은 값의 합으로 중복 방지 가능함
*/


#include <iostream>
#include <vector>
#include <numeric>

using namespace std;

const int HASH_TABLE_SIZE = 100000;

struct LinkedNode {
    int nodeId[6];
    LinkedNode *Next;
};

LinkedNode *HashTable[HASH_TABLE_SIZE] = {nullptr};

private bool



