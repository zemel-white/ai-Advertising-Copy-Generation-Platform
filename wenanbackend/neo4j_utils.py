from neo4j import GraphDatabase

class Neo4jHandler:
    def __init__(self, uri, user, password):
        self.driver = GraphDatabase.driver(uri, auth=(user, password))

    def close(self):
        self.driver.close()

    def save_triplets(self, triplets):
        """
        批量保存三元组到 Neo4j
        triplets: List[dict] -> [{'subject': 'A', 'predicate': '关系', 'object': 'B'}]
        """
        with self.driver.session() as session:
            session.execute_write(self._create_nodes_and_relationships, triplets)

    @staticmethod
    def _create_nodes_and_relationships(tx, triplets):
        for triplet in triplets:
            # Cypher 语句：创建/匹配节点并建立有向关系
            query = (
                "MERGE (s:Entity {name: $subject}) "
                "MERGE (o:Entity {name: $object}) "
                "MERGE (s)-[r:RELATION {name: $predicate}]->(o)"
            )
            tx.run(query, 
                   subject=triplet['subject'], 
                   object=triplet['object'], 
                   predicate=triplet['predicate'])

# 初始化实例 (建议从环境变量读取配置)
neo4j_client = Neo4jHandler("bolt://localhost:7687", "neo4j", "你的密码")